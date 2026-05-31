'use server'

import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getCallerProfile } from '@/app/lib/auth'

function compileSessionsToSlots(config: any) {
  const slotDuration = parseInt(config.slotDuration) || 30;
  const availability: any = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };

  const daysList = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const day of daysList) {
    const dayConfig = config.days?.[day];
    if (!dayConfig || !dayConfig.active) {
      continue;
    }

    const startStr = dayConfig.start; // e.g. "09:00"
    const endStr = dayConfig.end; // e.g. "18:00"
    if (!startStr || !endStr) continue;

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    const breaks = dayConfig.breaks || []; // e.g. [{ start: "13:00", end: "14:00" }]
    const parsedBreaks = breaks.map((br: any) => {
      const [sH, sM] = br.start.split(':').map(Number);
      const [eH, eM] = br.end.split(':').map(Number);
      return {
        start: sH * 60 + sM,
        end: eH * 60 + eM
      };
    });

    let currentMin = startMin;
    while (currentMin + slotDuration <= endMin) {
      // Check if current time falls in any break range
      const inBreak = parsedBreaks.some((br: any) => {
        return currentMin >= br.start && currentMin < br.end;
      });

      if (!inBreak) {
        // Format currentMin to 12-hour AM/PM string, e.g. "09:30 AM" or "01:00 PM"
        const hours24 = Math.floor(currentMin / 60);
        const mins = currentMin % 60;
        const ampm = hours24 >= 12 ? 'PM' : 'AM';
        const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
        
        // Zero padding for hours/mins
        const hhStr = String(hours12).padStart(2, '0');
        const mmStr = String(mins).padStart(2, '0');
        const time12Str = `${hhStr}:${mmStr} ${ampm}`;
        
        availability[day].push(time12Str);
      }

      currentMin += slotDuration;
    }
  }

  return availability;
}

function validateSessionsConfig(config: any): string | null {
  if (!config || typeof config !== 'object') {
    return 'Sessions configuration must be an object.';
  }

  if (typeof config.slotDuration !== 'number' || config.slotDuration <= 0) {
    return 'Slot duration must be a positive number.';
  }

  if (!config.days || typeof config.days !== 'object') {
    return 'Sessions configuration must include a days object.';
  }

  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const timeRegex = /^\d{2}:\d{2}$/;

  for (const day of validDays) {
    const dayConfig = config.days[day];
    if (!dayConfig) continue;

    if (typeof dayConfig.active !== 'boolean') {
      return `${day}: active must be a boolean.`;
    }

    if (!dayConfig.start || !timeRegex.test(dayConfig.start)) {
      return `${day}: start time must be in HH:MM format.`;
    }

    if (!dayConfig.end || !timeRegex.test(dayConfig.end)) {
      return `${day}: end time must be in HH:MM format.`;
    }

    if (!Array.isArray(dayConfig.breaks)) {
      return `${day}: breaks must be an array.`;
    }

    for (const br of dayConfig.breaks) {
      if (!br.start || !timeRegex.test(br.start)) {
        return `${day}: break start time must be in HH:MM format.`;
      }
      if (!br.end || !timeRegex.test(br.end)) {
        return `${day}: break end time must be in HH:MM format.`;
      }
    }
  }

  return null;
}

export async function saveDoctorSessions(doctorId: string, config: any) {
  const caller = await getCallerProfile()
  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can update doctor sessions.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  const validationError = validateSessionsConfig(config);
  if (validationError) {
    return { success: false, error: 'Invalid configuration: ' + validationError }
  }

  // Verify target is a doctor
  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', doctorId)
    .single()

  if (!target || target.role !== 'doctor') {
    return { success: false, error: 'Target profile is not a doctor.' }
  }

  // Compile config to slots availability
  const availability = compileSessionsToSlots(config);

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      sessions_config: config,
      availability: availability
    })
    .eq('id', doctorId)

  if (error) {
    return { success: false, error: 'Failed to update doctor session: ' + error.message }
  }

  return { success: true }
}

export async function saveDoctorOwnSessions(config: any) {
  const caller = await getCallerProfile()
  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'doctor') {
    return { success: false, error: 'Unauthorized: only doctors can configure their own sessions.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  const validationError = validateSessionsConfig(config);
  if (validationError) {
    return { success: false, error: 'Invalid configuration: ' + validationError }
  }

  // Compile config to slots availability
  const availability = compileSessionsToSlots(config);

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      sessions_config: config,
      availability: availability
    })
    .eq('id', caller.id)

  if (error) {
    return { success: false, error: 'Failed to update availability: ' + error.message }
  }

  return { success: true }
}
