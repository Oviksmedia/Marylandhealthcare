'use client';

import { Calendar, Video, Clock, FileText, Loader2, Receipt, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./my-appointments.module.css";
import { useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import Link from "next/link";
import { stripSystemMetadata } from "@/app/lib/telemedicine/note-utils";
import { rescheduleAppointment } from "@/app/dashboard/actions";
import { getBookedSlots } from "@/app/lib/telemedicine/booking";

const morningSlots = [
  { label: "08:00 AM", available: true },
  { label: "08:30 AM", available: true },
  { label: "09:00 AM", available: true },
  { label: "09:30 AM", available: true },
  { label: "10:00 AM", available: true },
  { label: "10:30 AM", available: true },
];

const afternoonSlots = [
  { label: "01:00 PM", available: true },
  { label: "01:30 PM", available: true },
  { label: "02:00 PM", available: true },
  { label: "02:30 PM", available: true },
  { label: "03:00 PM", available: true },
  { label: "03:30 PM", available: true },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isWeekend(year: number, month: number, day: number) {
  const date = new Date(year, month, day);
  return date.getDay() === 0 || date.getDay() === 6;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);

  // Reschedule state
  const [rescheduleApt, setRescheduleApt] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const email = profile?.email || user.email;
    if (email) {
      const { data } = await supabase
        .from('appointments')
        .select('*, clinical_notes:notes')
        .eq('patient_email', email.toLowerCase())
        .order('scheduled_at', { ascending: false });
      setAppointments(data || []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  function handleViewDetails(apt: any) {
    setSelectedApt(apt);
    if (apt.clinical_notes) {
      setClinicalNotes([
        {
          id: apt.id,
          author_name: 'Care Provider',
          created_at: apt.scheduled_at,
          content: stripSystemMetadata(apt.clinical_notes)
        }
      ]);
    } else {
      setClinicalNotes([]);
    }
  }

  // Fetch booked slots when reschedule date changes
  useEffect(() => {
    if (rescheduleDate) {
      const dateStr = `${rescheduleDate.getFullYear()}-${String(rescheduleDate.getMonth() + 1).padStart(2, '0')}-${String(rescheduleDate.getDate()).padStart(2, '0')}`;
      getBookedSlots(dateStr).then(timestamps => {
        const labels = timestamps.map(ts => {
          const date = new Date(ts);
          const lagosTime = new Date(date.getTime() + (1 * 60 * 60 * 1000));
          let hours = lagosTime.getUTCHours();
          const minutes = lagosTime.getUTCMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
          const hoursStr = hours < 10 ? '0' + hours : String(hours);
          return `${hoursStr}:${minutesStr} ${ampm}`;
        });
        // Also exclude the current appointment's own slot from booked list
        if (rescheduleApt) {
          const currentSlotDate = new Date(rescheduleApt.scheduled_at);
          const currentLagos = new Date(currentSlotDate.getTime() + (1 * 60 * 60 * 1000));
          let ch = currentLagos.getUTCHours();
          const cm = currentLagos.getUTCMinutes();
          const campm = ch >= 12 ? 'PM' : 'AM';
          ch = ch % 12;
          ch = ch ? ch : 12;
          const currentLabel = `${ch < 10 ? '0' + ch : String(ch)}:${cm < 10 ? '0' + cm : String(cm)} ${campm}`;
          setBookedSlots(labels.filter(l => l !== currentLabel));
        } else {
          setBookedSlots(labels);
        }
      });
    } else {
      setBookedSlots([]);
    }
  }, [rescheduleDate, rescheduleApt]);

  function openReschedule(apt: any) {
    setRescheduleApt(apt);
    setRescheduleDate(null);
    setRescheduleTime(null);
    setRescheduleError(null);
    setCalMonth(new Date().getMonth());
    setCalYear(new Date().getFullYear());
  }

  async function handleRescheduleConfirm() {
    if (!rescheduleApt || !rescheduleDate || !rescheduleTime) return;
    setIsRescheduling(true);
    setRescheduleError(null);

    // Build UTC timestamp in Lagos timezone (same logic as BookingWizard)
    const [time, modifier] = rescheduleTime.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    const year = rescheduleDate.getFullYear();
    const month = rescheduleDate.getMonth();
    const day = rescheduleDate.getDate();

    const scheduledAt = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
    scheduledAt.setUTCHours(scheduledAt.getUTCHours() - 1); // Lagos is UTC+1

    const result = await rescheduleAppointment(rescheduleApt.id, scheduledAt.toISOString());

    if (result.success) {
      setRescheduleApt(null);
      setRescheduleDate(null);
      setRescheduleTime(null);
      await loadAppointments();
    } else {
      setRescheduleError(result.error || 'Failed to reschedule.');
    }
    setIsRescheduling(false);
  }

  const today = new Date();
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDayOfWeek = getFirstDayOfWeek(calYear, calMonth);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const calendarMonthDate = new Date(calYear, calMonth, 1);
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const canGoPrev = calendarMonthDate > currentMonthDate;
  const canGoNext = calendarMonthDate < nextMonthDate;

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} size={32} />
        <p>Loading your appointments...</p>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(
    apt => new Date(apt.scheduled_at) >= new Date() && apt.status !== 'cancelled'
  );

  const pastAppointments = appointments.filter(
    apt => new Date(apt.scheduled_at) < new Date() || apt.status === 'completed'
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>My Appointments</h1>
          <p>View your upcoming and past consultations</p>
        </div>
        <Link href="/book" className={styles.bookBtn}>
          <Calendar size={18} />
          Book Appointment
        </Link>
      </div>

      {/* Upcoming Appointments */}
      <section className={styles.section}>
        <h2>
          <Calendar size={20} />
          Upcoming Appointments
        </h2>

        {upcomingAppointments.length === 0 ? (
          <div className={styles.emptyState}>
            <Calendar size={48} />
            <p>No upcoming appointments</p>
          </div>
        ) : (
          <div className={styles.cardsGrid}>
            {upcomingAppointments.map((apt) => (
              <div key={apt.id} className={styles.appointmentCard}>
                <div className={styles.cardHeader}>
                  <span className={apt.type === 'telemedicine' ? styles.badgeVirtual : styles.badgeClinic}>
                    {apt.type === 'telemedicine' ? 'Virtual' : 'In-Clinic'}
                  </span>
                  <span className={styles.statusBadge}>{apt.status}</span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.dateTime}>
                    <Calendar size={16} />
                    <span>{new Date(apt.scheduled_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className={styles.dateTime}>
                    <Clock size={16} />
                    <span>{new Date(apt.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {apt.type === 'telemedicine' && apt.meet_link && (
                    <a href={apt.meet_link} target="_blank" rel="noopener noreferrer" className={styles.joinBtn}>
                      <Video size={16} />
                      Join Video Call
                    </a>
                  )}
                </div>

                <div className={styles.cardActions}>
                  <button className={styles.detailsBtn} onClick={() => handleViewDetails(apt)}>
                    View Details
                  </button>
                  {(apt.status === 'pending' || apt.status === 'confirmed') && new Date(apt.scheduled_at) > new Date() && (
                    <button className={styles.rescheduleBtn} onClick={() => openReschedule(apt)}>
                      <RefreshCw size={14} />
                      Reschedule
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Appointments */}
      <section className={styles.section}>
        <h2>
          <Clock size={20} />
          Past Appointments
        </h2>

        {pastAppointments.length === 0 ? (
          <div className={styles.emptyState}>
            <Clock size={48} />
            <p>No past appointments</p>
          </div>
        ) : (
          <div className={styles.pastList}>
            {pastAppointments.map((apt) => (
              <div key={apt.id} className={styles.pastItem} onClick={() => handleViewDetails(apt)}>
                <div className={styles.pastInfo}>
                  <span className={apt.type === 'telemedicine' ? styles.badgeVirtual : styles.badgeClinic}>
                    {apt.type === 'telemedicine' ? 'Virtual' : 'In-Clinic'}
                  </span>
                  <span className={styles.pastDate}>
                    {new Date(apt.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className={styles.pastActions}>
                  {apt.status === 'completed' && <FileText size={16} />}
                  {apt.payment_status === 'paid' && <Receipt size={16} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Appointment Details Modal */}
      {selectedApt && (
        <div className={styles.modalOverlay} onClick={() => setSelectedApt(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Appointment Details</h2>
              <button onClick={() => setSelectedApt(null)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type</span>
                <span>{selectedApt.type === 'telemedicine' ? 'Virtual Consultation' : 'In-Clinic Visit'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date & Time</span>
                <span>{new Date(selectedApt.scheduled_at).toLocaleString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status</span>
                <span className={styles.statusBadge}>{selectedApt.status}</span>
              </div>
              {selectedApt.payment_status && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Payment</span>
                  <span className={selectedApt.payment_status === 'paid' ? styles.paidBadge : styles.pendingBadge}>
                    {selectedApt.payment_status === 'paid' ? `Paid - NGN ${selectedApt.amount?.toLocaleString()}` : 'Pending'}
                  </span>
                </div>
              )}

              {/* Encounter Notes */}
              <div className={styles.notesSection}>
                <h3>
                  <FileText size={18} />
                  Encounter Notes
                </h3>
                {clinicalNotes.length === 0 ? (
                  <p className={styles.noNotes}>No encounter notes yet</p>
                ) : (
                  <div className={styles.notesList}>
                    {clinicalNotes.map((note: any) => (
                      <div key={note.id} className={styles.noteCard}>
                        <div className={styles.noteHeader}>
                          <span className={styles.noteAuthor}>{note.author_name || 'Doctor'}</span>
                          <span className={styles.noteDate}>
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={styles.noteContent}>{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className={styles.modalOverlay} onClick={() => setRescheduleApt(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Reschedule Appointment</h2>
              <button onClick={() => setRescheduleApt(null)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Currently scheduled for: <strong>{new Date(rescheduleApt.scheduled_at).toLocaleString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}</strong>
              </p>

              {/* Calendar */}
              <div className={styles.rescheduleCal}>
                <div className={styles.calHeader}>
                  <button onClick={() => {
                    if (canGoPrev) {
                      const d = new Date(calYear, calMonth - 1, 1);
                      setCalMonth(d.getMonth());
                      setCalYear(d.getFullYear());
                    }
                  }} disabled={!canGoPrev} className={styles.calNav} type="button">
                    <ChevronLeft size={18} />
                  </button>
                  <span className={styles.calTitle}>{monthNames[calMonth]} {calYear}</span>
                  <button onClick={() => {
                    if (canGoNext) {
                      const d = new Date(calYear, calMonth + 1, 1);
                      setCalMonth(d.getMonth());
                      setCalYear(d.getFullYear());
                    }
                  }} disabled={!canGoNext} className={styles.calNav} type="button">
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className={styles.calGrid}>
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className={styles.calDayName}>{d}</div>
                  ))}
                  {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
                  {calendarDays.map((day) => {
                    const dateObj = new Date(calYear, calMonth, day);
                    const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const weekend = isWeekend(calYear, calMonth, day);
                    const isSelected = rescheduleDate?.getDate() === day && rescheduleDate?.getMonth() === calMonth && rescheduleDate?.getFullYear() === calYear;
                    const disabled = isPast || weekend;

                    return (
                      <button
                        key={day}
                        type="button"
                        className={`${styles.calDay} ${isSelected ? styles.calDaySelected : ""} ${disabled ? styles.calDayDisabled : ""}`}
                        disabled={disabled}
                        onClick={() => {
                          setRescheduleDate(new Date(calYear, calMonth, day));
                          setRescheduleTime(null);
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              {rescheduleDate && (
                <div className={styles.rescheduleSlots}>
                  <h4 style={{ margin: "0 0 0.75rem", color: "var(--primary)", fontSize: "0.95rem" }}>
                    Available Times for {rescheduleDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h4>

                  <div className={styles.slotGroup}>
                    <span className={styles.slotGroupLabel}>Morning</span>
                    <div className={styles.slotGrid}>
                      {morningSlots.map(slot => {
                        const now = new Date();
                        const isToday = rescheduleDate.toDateString() === now.toDateString();
                        let isPast = false;
                        if (isToday) {
                          const [t, mod] = slot.label.split(" ");
                          let [h, m] = t.split(":").map(Number);
                          if (mod === "PM" && h !== 12) h += 12;
                          if (mod === "AM" && h === 12) h = 0;
                          const st = new Date(); st.setHours(h, m, 0, 0);
                          isPast = st < now;
                        }
                        const isBooked = bookedSlots.includes(slot.label);
                        const available = !isPast && !isBooked;

                        return available ? (
                          <button
                            key={slot.label}
                            type="button"
                            className={`${styles.slotPill} ${rescheduleTime === slot.label ? styles.slotPillSelected : ""}`}
                            onClick={() => setRescheduleTime(slot.label)}
                          >
                            {slot.label}
                          </button>
                        ) : (
                          <button key={slot.label} type="button" className={`${styles.slotPill} ${styles.slotPillDisabled}`} disabled>
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.slotGroup}>
                    <span className={styles.slotGroupLabel}>Afternoon</span>
                    <div className={styles.slotGrid}>
                      {afternoonSlots.map(slot => {
                        const now = new Date();
                        const isToday = rescheduleDate.toDateString() === now.toDateString();
                        let isPast = false;
                        if (isToday) {
                          const [t, mod] = slot.label.split(" ");
                          let [h, m] = t.split(":").map(Number);
                          if (mod === "PM" && h !== 12) h += 12;
                          if (mod === "AM" && h === 12) h = 0;
                          const st = new Date(); st.setHours(h, m, 0, 0);
                          isPast = st < now;
                        }
                        const isBooked = bookedSlots.includes(slot.label);
                        const available = !isPast && !isBooked;

                        return available ? (
                          <button
                            key={slot.label}
                            type="button"
                            className={`${styles.slotPill} ${rescheduleTime === slot.label ? styles.slotPillSelected : ""}`}
                            onClick={() => setRescheduleTime(slot.label)}
                          >
                            {slot.label}
                          </button>
                        ) : (
                          <button key={slot.label} type="button" className={`${styles.slotPill} ${styles.slotPillDisabled}`} disabled>
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {rescheduleError && (
                <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{rescheduleError}</p>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className={styles.cancelRescheduleBtn}
                  onClick={() => setRescheduleApt(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.confirmRescheduleBtn}
                  disabled={!rescheduleDate || !rescheduleTime || isRescheduling}
                  onClick={handleRescheduleConfirm}
                >
                  {isRescheduling ? (
                    <><Loader2 size={16} className={styles.spinner} /> Rescheduling...</>
                  ) : (
                    <><RefreshCw size={16} /> Confirm Reschedule</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
