'use server'

import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Resolves the caller's identity and role from the server auth session.
 * Returns null if unauthenticated or profile not found.
 */
async function getCallerProfile() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured')
    return null
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  return profile
}

export async function addDoctorWithAuth(data: {
  fullName: string
  email: string
  specialty: string
  phone: string
}) {
  // Server-side role verification
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can add doctors.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  if (!data.fullName || !data.email) {
    return { success: false, error: 'Name and email are required.' }
  }

  // Check if profile with this email already exists
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', data.email)
    .single()

  if (existing) {
    return { success: false, error: 'A profile with this email already exists.' }
  }

  // Create Supabase Auth account for the doctor
  const tempPassword = Math.random().toString(36).slice(-12) + 'A1!' // Generate temp password

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: data.fullName,
      role: 'doctor'
    }
  })

  if (authError) {
    console.error('Auth account creation failed:', authError)
    return { success: false, error: 'Failed to create login account: ' + authError.message }
  }

  // Create or update profile linked to auth user
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert([{
      id: authData.user.id,
      full_name: data.fullName,
      email: data.email,
      role: 'doctor',
      specialty: data.specialty,
      phone: data.phone
    }])

  if (profileError) {
    console.error('Profile creation failed:', profileError)
    return { success: false, error: 'Failed to create doctor profile: ' + profileError.message }
  }

  return {
    success: true,
    tempPassword,
    message: `Doctor added successfully. They can log in with their email and temporary password: ${tempPassword}`
  }
}

export async function editDoctorProfile(doctorId: string, data: {
  fullName: string
  email: string
  specialty: string
  phone: string
}) {
  // Server-side role verification
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can edit doctor profiles.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  if (!data.fullName || !data.email) {
    return { success: false, error: 'Name and email are required.' }
  }

  // Verify the target is actually a doctor
  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', doctorId)
    .single()

  if (!target || target.role !== 'doctor') {
    return { success: false, error: 'Target profile is not a doctor.' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: data.fullName,
      email: data.email,
      specialty: data.specialty,
      phone: data.phone
    })
    .eq('id', doctorId)

  if (error) {
    return { success: false, error: 'Failed to update doctor profile: ' + error.message }
  }

  return { success: true }
}

export async function deactivateDoctor(doctorId: string) {
  // Server-side role verification
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can deactivate doctors.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  // Verify the target is actually a doctor before deleting
  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', doctorId)
    .single()

  if (!target || target.role !== 'doctor') {
    return { success: false, error: 'Target profile is not a doctor.' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', doctorId)
    .eq('role', 'doctor') // Safety check: only delete doctors

  if (error) {
    return { success: false, error: 'Failed to deactivate doctor: ' + error.message }
  }

  return { success: true }
}
