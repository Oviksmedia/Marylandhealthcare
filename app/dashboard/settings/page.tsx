'use client';

import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Lock, 
  CheckCircle2, 
  Loader2,
  Stethoscope,
  Trash2,
  Clock,
  Plus
} from "lucide-react";
import styles from "./settings.module.css";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { sendPasswordResetEmail } from "@/app/login/actions";
import { saveDoctorOwnSessions } from "../doctor-sessions/actions";

interface BreakConfig {
  start: string;
  end: string;
}

interface DayConfig {
  active: boolean;
  start: string;
  end: string;
  breaks: BreakConfig[];
}

interface SessionsConfig {
  slotDuration: number;
  days: Record<string, DayConfig>;
}

const defaultSessionsConfig: SessionsConfig = {
  slotDuration: 30,
  days: {
    monday: { active: true, start: "09:00", end: "18:00", breaks: [{ start: "13:00", end: "14:00" }] },
    tuesday: { active: true, start: "09:00", end: "18:00", breaks: [{ start: "13:00", end: "14:00" }] },
    wednesday: { active: true, start: "09:00", end: "18:00", breaks: [{ start: "13:00", end: "14:00" }] },
    thursday: { active: true, start: "09:00", end: "18:00", breaks: [{ start: "13:00", end: "14:00" }] },
    friday: { active: true, start: "09:00", end: "18:00", breaks: [{ start: "13:00", end: "14:00" }] },
    saturday: { active: false, start: "09:00", end: "18:00", breaks: [] },
    sunday: { active: false, start: "09:00", end: "18:00", breaks: [] }
  }
};

export default function SettingsPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [isSavingAvail, setIsSavingAvail] = useState(false);

  // Sessions schedule states
  const [sessionsConfig, setSessionsConfig] = useState<SessionsConfig>(defaultSessionsConfig);
  const [durationHours, setDurationHours] = useState("00");
  const [durationMinutes, setDurationMinutes] = useState("30");


  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = getSupabaseBrowserClient();

  async function loadProfile() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setUserEmail(user.email || "");
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile);
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        
        // Load sessions config
        if (profile.sessions_config) {
          setSessionsConfig(profile.sessions_config);
          const duration = profile.sessions_config.slotDuration || 30;
          const h = Math.floor(duration / 60);
          const m = duration % 60;
          setDurationHours(String(h).padStart(2, '0'));
          setDurationMinutes(String(m).padStart(2, '0'));
        }
      } else {
        const fallbackProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || "",
          role: user.user_metadata?.role || "patient",
          phone: user.user_metadata?.phone || ""
        };
        setUserProfile(fallbackProfile);
        setFullName(fallbackProfile.full_name);
        setPhone(fallbackProfile.phone);
      }
    } else if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      // Mock admin bypass for local development only
      setUserEmail("tester@marylandhealthcare.com.ng");
      setUserProfile({
        id: "mock-admin-id",
        full_name: "Test Administrator",
        role: "admin",
        phone: "08000000000"
      });
      setFullName("Test Administrator");
      setPhone("08000000000");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, [supabase]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
        setSuccessMessage("Your profile information has been successfully updated (Local Test Mode)!");
        setIsSaving(false);
        return;
      }
      setErrorMessage("You must be logged in to update your profile.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone
      })
      .eq('id', user.id);

    if (error) {
      setErrorMessage("Error updating profile details: " + error.message);
    } else {
      setSuccessMessage("Your profile information has been successfully updated!");
      // Reload profile
      loadProfile();
    }
    setIsSaving(false);
  }

  async function handleResetPassword() {
    setIsResetting(true);
    setSuccessMessage("");
    setErrorMessage("");

    const result = await sendPasswordResetEmail(userEmail);

    if (result.success) {
      setSuccessMessage("A secure password reset link has been dispatched to your email address.");
    } else {
      setErrorMessage("Failed to send reset link: " + (result.error || "Unknown error"));
    }
    setIsResetting(false);
  }

  // Helper functions for doctor sessions
  function calculateShiftDuration(dayConfig: DayConfig) {
    if (!dayConfig.active) return "0h 0m";
    const [startH, startM] = dayConfig.start.split(':').map(Number);
    const [endH, endM] = dayConfig.end.split(':').map(Number);
    let totalMin = (endH * 60 + endM) - (startH * 60 + startM);

    if (dayConfig.breaks) {
      dayConfig.breaks.forEach((br: BreakConfig) => {
        const [bsH, bsM] = br.start.split(':').map(Number);
        const [beH, beM] = br.end.split(':').map(Number);
        const breakMin = (beH * 60 + beM) - (bsH * 60 + bsM);
        if (breakMin > 0) {
          totalMin -= breakMin;
        }
      });
    }

    if (totalMin <= 0) return "0h 0m";
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}m`;
  }

  function formatTime12(time24: string) {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(':');
    const h = parseInt(hStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${mStr} ${ampm}`;
  }

  function handleDayActiveToggle(day: string) {
    setSessionsConfig((prev: SessionsConfig) => {
      const updatedDays = { ...prev.days };
      updatedDays[day] = {
        ...updatedDays[day],
        active: !updatedDays[day].active
      };
      return {
        ...prev,
        days: updatedDays
      };
    });
  }

  const isAllDaysSelected = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].every(
    day => sessionsConfig.days?.[day]?.active
  );

  function handleSelectAllDaysToggle() {
    const nextState = !isAllDaysSelected;
    setSessionsConfig((prev: SessionsConfig) => {
      const updatedDays = { ...prev.days };
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
        updatedDays[day] = {
          ...updatedDays[day],
          active: nextState
        };
      });
      return {
        ...prev,
        days: updatedDays
      };
    });
  }

  function handleTimeFieldChange(day: string, field: 'start' | 'end', type: 'h' | 'm', value: string) {
    setSessionsConfig((prev: SessionsConfig) => {
      const updatedDays = { ...prev.days };
      const currentTime = updatedDays[day][field];
      const [h, m] = currentTime.split(':');
      const newTime = type === 'h' ? `${value}:${m}` : `${h}:${value}`;
      updatedDays[day] = {
        ...updatedDays[day],
        [field]: newTime
      };
      return {
        ...prev,
        days: updatedDays
      };
    });
  }

  function handleBreakFieldChange(day: string, breakIndex: number, field: 'start' | 'end', type: 'h' | 'm', value: string) {
    setSessionsConfig((prev: SessionsConfig) => {
      const updatedDays = { ...prev.days };
      const dayConfig = updatedDays[day];
      const updatedBreaks = [...dayConfig.breaks];
      const currentTime = updatedBreaks[breakIndex][field];
      const [h, m] = currentTime.split(':');
      const newTime = type === 'h' ? `${value}:${m}` : `${h}:${value}`;
      updatedBreaks[breakIndex] = {
        ...updatedBreaks[breakIndex],
        [field]: newTime
      };
      updatedDays[day] = {
        ...dayConfig,
        breaks: updatedBreaks
      };
      return {
        ...prev,
        days: updatedDays
      };
    });
  }

  function handleAddBreak(day: string) {
    const currentBreaks = sessionsConfig.days?.[day]?.breaks || [];
    if (currentBreaks.length >= 3) {
      setErrorMessage("You can configure up to 3 breaks per day.");
      return;
    }

    setSessionsConfig((prev: SessionsConfig) => {
      const updatedDays = { ...prev.days };
      const breaks = updatedDays[day].breaks || [];
      updatedDays[day] = {
        ...updatedDays[day],
        breaks: [...breaks, { start: "13:00", end: "14:00" }]
      };
      return {
        ...prev,
        days: updatedDays
      };
    });
  }

  function handleRemoveBreak(day: string, index: number) {
    setSessionsConfig((prev: SessionsConfig) => {
      const updatedDays = { ...prev.days };
      const currentBreaks = updatedDays[day].breaks || [];
      updatedDays[day] = {
        ...updatedDays[day],
        breaks: currentBreaks.filter((_: BreakConfig, idx: number) => idx !== index)
      };
      return {
        ...prev,
        days: updatedDays
      };
    });
  }

  async function handleSaveAvailability(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingAvail(true);
    setSuccessMessage("");
    setErrorMessage("");

    const slotDuration = (parseInt(durationHours) * 60) + parseInt(durationMinutes);
    if (slotDuration <= 0) {
      setErrorMessage("Slot duration must be greater than 0 minutes.");
      setIsSavingAvail(false);
      return;
    }

    const payload = {
      ...sessionsConfig,
      slotDuration
    };

    const result = await saveDoctorOwnSessions(payload);

    if (!result.success) {
      setErrorMessage("Error updating availability: " + result.error);
    } else {
      setSuccessMessage("Your weekly sessions schedule has been successfully updated!");
      loadProfile();
    }
    setIsSavingAvail(false);
  }


  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 className={styles.spinner} size={30} />
        <p>Loading security profile credentials...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Account & Security Settings</h1>
          <p>Update your personal information, roles, and manage password security.</p>
        </div>
      </div>

      {(successMessage || errorMessage) && (
        <div className={styles.notificationRow}>
          {successMessage && (
            <div className={styles.successNotification}>
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className={styles.errorNotification}>
              <CheckCircle2 size={18} style={{ color: '#ef4444' }} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      <div className={styles.settingsGrid}>
        <div className={styles.profileCard}>
          <h2>{userProfile?.role === 'patient' ? "Patient Profile" : "Attending Staff Profile"}</h2>
          <div className={styles.badgeRow}>
            <span className={styles.roleBadge}>
              <Shield size={14} />
              {userProfile?.role || 'Staff'}
            </span>
            {userProfile?.specialty && (
              <span className={styles.specialtyBadge}>
                <Stethoscope size={14} />
                {userProfile.specialty}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>
                <User size={16} />
                Full Name
              </label>
              <input 
                type="text" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Stephen Ekwelibe"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>
                <Mail size={16} />
                Primary Email (Read-Only)
              </label>
              <input 
                type="email" 
                disabled 
                value={userEmail}
                className={styles.disabledInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>
                <Phone size={16} />
                Phone Number
              </label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="080XXXXXXXX"
              />
            </div>

            <button type="submit" className={styles.saveBtn} disabled={isSaving}>
              {isSaving ? <Loader2 className={styles.spinner} size={18} /> : "Save Changes"}
            </button>
          </form>
        </div>

        <div className={styles.securityCard}>
          <h2>Credentials & Security</h2>
          <p>Initiate a secure password reset. An automated recovery link will be sent to your primary email address immediately.</p>
          
          <div className={styles.securityActionRow}>
            <div className={styles.securityInfo}>
              <Lock size={20} color="var(--primary)" />
              <div>
                <strong>Authentication Key</strong>
                <span>Updates passwords, token-keys and active sessions.</span>
              </div>
            </div>
            <button 
              className={styles.resetBtn}
              onClick={handleResetPassword}
              disabled={isResetting}
            >
              {isResetting ? <Loader2 className={styles.spinner} size={16} /> : "Reset Account Password"}
            </button>
          </div>
        </div>

        {userProfile?.role === 'doctor' && (
          <div className={styles.availabilityCard} style={{ gridColumn: 'span 2' }}>
            <h2>Weekly Work Hours & Sessions Configuration</h2>
            <p style={{ marginBottom: '1.5rem' }}>Define your weekly day ranges, time slots, and clinical lunch breaks.</p>
            
            <div className={styles.inputGroup} style={{ maxWidth: '300px', marginBottom: '1.5rem' }}>
              <label>Time Slot Duration</label>
              <div className={styles.timeDurationPicker}>
                <select value={durationHours} onChange={(e) => setDurationHours(e.target.value)}>
                  {Array.from({ length: 5 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className={styles.durationColon}>:</span>
                <select value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)}>
                  {["00", "15", "30", "45"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.selectAllRow}>
              <input 
                type="checkbox" 
                id="selectAllDays" 
                checked={isAllDaysSelected} 
                onChange={handleSelectAllDaysToggle} 
                className={styles.checkboxInput}
              />
              <label htmlFor="selectAllDays" style={{ cursor: 'pointer' }}>Select All Days</label>
            </div>

            <div className={styles.sessionsGrid}>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                const dayConfig = sessionsConfig.days?.[day] || { active: false, start: "09:00", end: "18:00", breaks: [] };
                const [startH, startM] = dayConfig.start.split(':');
                const [endH, endM] = dayConfig.end.split(':');

                return (
                  <div key={day} className={`${styles.dayCard} ${!dayConfig.active ? styles.dayCardInactive : ""}`}>
                    <div className={styles.dayCardHeader}>
                      <div className={styles.dayTitleRow}>
                        <input 
                          type="checkbox" 
                          id={`day-${day}`} 
                          checked={dayConfig.active}
                          onChange={() => handleDayActiveToggle(day)}
                          className={styles.checkboxInput}
                        />
                        <label htmlFor={`day-${day}`} style={{ cursor: 'pointer' }}>
                          <strong style={{ textTransform: 'capitalize' }}>{day}</strong>
                        </label>
                      </div>
                      {dayConfig.active && (dayConfig.breaks || []).length === 0 && (
                        <button type="button" onClick={() => handleAddBreak(day)} className={styles.addBreakBtn}>
                          Add Break
                        </button>
                      )}
                    </div>

                    {dayConfig.active && (
                      <>
                        <div className={styles.timeFieldsRow}>
                          <div className={styles.timeInputWrapper}>
                            <span className={styles.timeInputLabel}>Session Start</span>
                            <div className={styles.timeDurationPicker}>
                              <select value={startH} onChange={(e) => handleTimeFieldChange(day, 'start', 'h', e.target.value)}>
                                {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                              <span className={styles.durationColon}>:</span>
                              <select value={startM} onChange={(e) => handleTimeFieldChange(day, 'start', 'm', e.target.value)}>
                                {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className={styles.timeInputWrapper}>
                            <span className={styles.timeInputLabel}>Session End</span>
                            <div className={styles.timeDurationPicker}>
                              <select value={endH} onChange={(e) => handleTimeFieldChange(day, 'end', 'h', e.target.value)}>
                                {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                              <span className={styles.durationColon}>:</span>
                              <select value={endM} onChange={(e) => handleTimeFieldChange(day, 'end', 'm', e.target.value)}>
                                {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        {(dayConfig.breaks || []).map((br: BreakConfig, brIdx: number) => {
                          const [brStartH, brStartM] = br.start.split(':');
                          const [brEndH, brEndM] = br.end.split(':');

                          return (
                            <div key={brIdx} className={styles.breaksSection}>
                              <div className={styles.breaksHeader}>
                                <span>Clinical Lunch Break</span>
                                <button type="button" onClick={() => handleRemoveBreak(day, brIdx)} className={styles.removeBreakBtn}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className={styles.breakRow}>
                                <div className={styles.timeInputWrapper}>
                                  <span className={styles.timeInputLabel}>Break Start</span>
                                  <div className={styles.timeDurationPicker}>
                                    <select value={brStartH} onChange={(e) => handleBreakFieldChange(day, brIdx, 'start', 'h', e.target.value)}>
                                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <span className={styles.durationColon}>:</span>
                                    <select value={brStartM} onChange={(e) => handleBreakFieldChange(day, brIdx, 'start', 'm', e.target.value)}>
                                      {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div className={styles.timeInputWrapper}>
                                  <span className={styles.timeInputLabel}>Break End</span>
                                  <div className={styles.timeDurationPicker}>
                                    <select value={brEndH} onChange={(e) => handleBreakFieldChange(day, brIdx, 'end', 'h', e.target.value)}>
                                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <span className={styles.durationColon}>:</span>
                                    <select value={brEndM} onChange={(e) => handleBreakFieldChange(day, brIdx, 'end', 'm', e.target.value)}>
                                      {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <div className={styles.summaryBanner}>
                          <span className={styles.summaryDuration}>Session Duration: {calculateShiftDuration(dayConfig)}</span>
                          <span className={styles.summaryTimes}>Time: {formatTime12(dayConfig.start)} - {formatTime12(dayConfig.end)}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <button 
              type="button" 
              className={styles.saveAvailBtn} 
              disabled={isSavingAvail}
              onClick={handleSaveAvailability}
            >
              {isSavingAvail ? <Loader2 className={styles.spinner} size={18} /> : "Update Availability Schedule"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
