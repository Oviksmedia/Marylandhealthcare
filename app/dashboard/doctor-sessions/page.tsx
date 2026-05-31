'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  X, 
  Loader2, 
  Plus 
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { saveDoctorSessions } from "./actions";
import styles from "./sessions.module.css";

const daysList = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type DayName = typeof daysList[number];

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
  days: Record<DayName, DayConfig>;
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

const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export default function DoctorSessionsPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  
  const [sessionsConfig, setSessionsConfig] = useState<SessionsConfig>(defaultSessionsConfig);
  const [durationHours, setDurationHours] = useState<string>("00");
  const [durationMinutes, setDurationMinutes] = useState<string>("30");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-hide toast alerts
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load active doctors
  async function loadDoctors() {
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'doctor')
      .order('full_name', { ascending: true });
    
    const docs = data || [];
    setDoctors(docs);
    
    if (docs.length > 0) {
      setSelectedDoctorId(docs[0].id);
      setSelectedDoctor(docs[0]);
      setSessionsConfig(docs[0].sessions_config || defaultSessionsConfig);
      
      const duration = docs[0].sessions_config?.slotDuration || 30;
      const h = Math.floor(duration / 60);
      const m = duration % 60;
      setDurationHours(String(h).padStart(2, '0'));
      setDurationMinutes(String(m).padStart(2, '0'));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadDoctors();
  }, [supabase]);

  // Trigger config load on doctor swap
  function handleDoctorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedDoctorId(id);
    const doc = doctors.find(d => d.id === id);
    setSelectedDoctor(doc);
    
    if (doc) {
      const config = doc.sessions_config || defaultSessionsConfig;
      setSessionsConfig(config);
      
      const duration = config.slotDuration || 30;
      const h = Math.floor(duration / 60);
      const m = duration % 60;
      setDurationHours(String(h).padStart(2, '0'));
      setDurationMinutes(String(m).padStart(2, '0'));
    }
  }

  // Calculate shift duration in hh/mm
  function calculateShiftDuration(dayConfig: DayConfig) {
    if (!dayConfig.active) return "0h 0m";
    const [startH, startM] = dayConfig.start.split(':').map(Number);
    const [endH, endM] = dayConfig.end.split(':').map(Number);
    let totalMin = (endH * 60 + endM) - (startH * 60 + startM);

    if (dayConfig.breaks) {
      dayConfig.breaks.forEach((br) => {
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

  // Convert "09:00" to "09:00 AM"
  function formatTime12(time24: string) {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(':');
    const h = parseInt(hStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${mStr} ${ampm}`;
  }

  // Toggle single day active checkbox
  function handleDayActiveToggle(day: DayName) {
    setSessionsConfig((prev) => {
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

  // Checkbox select all days toggle
  const isAllDaysSelected = daysList.every(day => sessionsConfig.days[day].active);
  function handleSelectAllDaysToggle() {
    const nextState = !isAllDaysSelected;
    setSessionsConfig((prev) => {
      const updatedDays = { ...prev.days };
      daysList.forEach(day => {
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

  // Day field values (start/end) update handler
  function handleTimeFieldChange(day: DayName, field: 'start' | 'end', type: 'h' | 'm', value: string) {
    setSessionsConfig((prev) => {
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

  // Break values update handler
  function handleBreakFieldChange(day: DayName, breakIndex: number, field: 'start' | 'end', type: 'h' | 'm', value: string) {
    setSessionsConfig((prev) => {
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

  // Add a new lunch break to a day
  function handleAddBreak(day: DayName) {
    const currentBreaks = sessionsConfig.days[day].breaks || [];
    if (currentBreaks.length >= 3) {
      setToast({ message: "You can configure up to 3 breaks per day.", type: 'error' });
      return;
    }

    setSessionsConfig((prev) => {
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

  // Delete a break
  function handleRemoveBreak(day: DayName, index: number) {
    setSessionsConfig((prev) => {
      const updatedDays = { ...prev.days };
      const currentBreaks = updatedDays[day].breaks || [];
      
      updatedDays[day] = {
        ...updatedDays[day],
        breaks: currentBreaks.filter((_, idx) => idx !== index)
      };
      
      return {
        ...prev,
        days: updatedDays
      };
    });
  }

  // Save changes
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoctorId) {
      setToast({ message: "No doctor selected.", type: 'error' });
      return;
    }

    setIsSaving(true);

    const slotDuration = (parseInt(durationHours) * 60) + parseInt(durationMinutes);
    if (slotDuration <= 0) {
      setToast({ message: "Slot duration must be greater than 0 minutes.", type: 'error' });
      setIsSaving(false);
      return;
    }

    const payload = {
      ...sessionsConfig,
      slotDuration
    };

    const result = await saveDoctorSessions(selectedDoctorId, payload);
    if (!result.success) {
      setToast({ message: "Error saving sessions: " + result.error, type: 'error' });
    } else {
      setToast({ message: `Successfully updated clinical sessions for Dr. ${selectedDoctor.full_name}!`, type: 'success' });
      
      // Update local doctors array with the updated configuration
      setDoctors(prev => prev.map(d => {
        if (d.id === selectedDoctorId) {
          return {
            ...d,
            sessions_config: payload
          };
        }
        return d;
      }));
    }
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={40} color="var(--primary)" />
        <p>Loading medical staff directory...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumbs}>
        <Link href="/dashboard">Home</Link>
        <span className={styles.breadcrumbSeparator}>&raquo;</span>
        <Link href="/dashboard/doctors">Doctors</Link>
        <span className={styles.breadcrumbSeparator}>&raquo;</span>
        <span className={styles.breadcrumbActive}>Doctor Sessions</span>
      </div>

      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Configure Doctor Work Hours</h1>
          <p>Define weekly day ranges, time slots, and clinical breaks for medical professionals.</p>
        </div>
        <button className={styles.backBtn} onClick={() => router.push("/dashboard/doctors")}>
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className={styles.configHeaderCard}>
          <div className={styles.inputGroup}>
            <label>Select Doctor*</label>
            <select value={selectedDoctorId} onChange={handleDoctorChange}>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.full_name} ({doc.specialty || "General Medicine"})</option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>Time Slot Duration*</label>
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

        <div className={styles.grid}>
          {daysList.map((day) => {
            const dayConfig = sessionsConfig.days[day];
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
                      <strong>{day}</strong>
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
                            {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <span className={styles.durationColon}>:</span>
                          <select value={startM} onChange={(e) => handleTimeFieldChange(day, 'start', 'm', e.target.value)}>
                            {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className={styles.timeInputWrapper}>
                        <span className={styles.timeInputLabel}>Session End</span>
                        <div className={styles.timeDurationPicker}>
                          <select value={endH} onChange={(e) => handleTimeFieldChange(day, 'end', 'h', e.target.value)}>
                            {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <span className={styles.durationColon}>:</span>
                          <select value={endM} onChange={(e) => handleTimeFieldChange(day, 'end', 'm', e.target.value)}>
                            {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {(dayConfig.breaks || []).map((br, brIdx) => {
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
                                  {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span className={styles.durationColon}>:</span>
                                <select value={brStartM} onChange={(e) => handleBreakFieldChange(day, brIdx, 'start', 'm', e.target.value)}>
                                  {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className={styles.timeInputWrapper}>
                              <span className={styles.timeInputLabel}>Break End</span>
                              <div className={styles.timeDurationPicker}>
                                <select value={brEndH} onChange={(e) => handleBreakFieldChange(day, brIdx, 'end', 'h', e.target.value)}>
                                  {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span className={styles.durationColon}>:</span>
                                <select value={brEndM} onChange={(e) => handleBreakFieldChange(day, brIdx, 'end', 'm', e.target.value)}>
                                  {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
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

        <div className={styles.actionRow}>
          <button type="submit" disabled={isSaving} className={styles.saveBtn}>
            {isSaving ? (
              <>
                <Loader2 className={styles.spinner} size={20} />
                Saving Work Hours...
              </>
            ) : (
              <>
                <Clock size={20} />
                Update Doctor Sessions
              </>
            )}
          </button>
        </div>
      </form>

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <div className={styles.toastInner}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className={styles.toastCloseBtn}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
