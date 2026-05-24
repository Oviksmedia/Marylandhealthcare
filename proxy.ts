import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const protectedRoutes = ['/dashboard']
const publicRoutes = ['/login', '/', '/reset-password']

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))

  // Allow public routes through without auth checks
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Check for Supabase auth session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // If env vars are missing and mock auth is enabled, allow through
    if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Create a response object to pass to Supabase
  const response = NextResponse.next()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Mock auth bypass for local development
    if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      return response
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$|.*\\.webp$|.*\\.ico$).*)'],
}
