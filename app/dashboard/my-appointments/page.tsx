'use client';

import { 
  Calendar, 
  Video, 
  Clock, 
  FileText, 
  Loader2, 
  Receipt, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  HeartPulse, 
  X, 
  Trash2, 
  ShieldAlert,
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from "lucide-react";
import styles from "./my-appointments.module.css";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { stripSystemMetadata } from "@/app/lib/telemedicine/note-utils";
import { getPatientAppointments, cancelAppointmentPatient, rescheduleAppointment } from "@/app/dashboard/actions";
import { getDaySlots, confirmBooking } from "@/app/lib/telemedicine/booking";
import { usePaystackPayment } from "react-paystack";

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
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Reschedule state
  const [rescheduleApt, setRescheduleApt] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [allSlots, setAllSlots] = useState<string[]>([]);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Cancellation state
  const [cancelApt, setCancelApt] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Paystack checkout state for unpaid appointments
  const [payConfig, setPayConfig] = useState<any>({
    reference: "",
    email: "",
    amount: 0,
    publicKey: "",
    appointmentId: ""
  });
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  const initializePayment = usePaystackPayment(payConfig);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPatientAppointments();
      setAppointments(data || []);
    } catch (err) {
      console.error("Failed to load patient appointments:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger Paystack SDK when config and isPaying flag are set
  useEffect(() => {
    if (payConfig.reference && payConfig.publicKey && isPaying) {
      initializePayment({
        onSuccess: async (reference: any) => {
          setIsPaying(false);
          const ref = reference?.reference || payConfig.reference;
          const result = await confirmBooking(payConfig.appointmentId, ref);
          if (result.success) {
            setPaymentSuccessMsg("Your payment was successful and the appointment is now fully confirmed!");
            setPayConfig({ reference: "", email: "", amount: 0, publicKey: "", appointmentId: "" });
            await loadAppointments();
          } else {
            alert("Payment completed, but appointment confirmation failed: " + result.error);
          }
        },
        onClose: () => {
          setIsPaying(false);
          setPayConfig({ reference: "", email: "", amount: 0, publicKey: "", appointmentId: "" });
        }
      });
    }
  }, [payConfig, initializePayment, isPaying, loadAppointments]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  function handleViewDetails(apt: any) {
    setSelectedApt(apt);
    if (apt.clinical_notes) {
      setClinicalNotes([
        {
          id: apt.id,
          author_name: apt.doctor?.full_name || 'Care Provider',
          created_at: apt.scheduled_at,
          content: stripSystemMetadata(apt.clinical_notes)
        }
      ]);
    } else {
      setClinicalNotes([]);
    }
  }

  // Fetch slots when reschedule date changes
  useEffect(() => {
    if (rescheduleDate) {
      const dateStr = `${rescheduleDate.getFullYear()}-${String(rescheduleDate.getMonth() + 1).padStart(2, '0')}-${String(rescheduleDate.getDate()).padStart(2, '0')}`;
      const specialty = rescheduleApt?.service || null;
      getDaySlots(dateStr, specialty).then(({ allSlots: fetchedSlots, bookedSlots: fetchedBooked }) => {
        setAllSlots(fetchedSlots);
        // Exclude the current appointment's own slot from booked list
        if (rescheduleApt) {
          const currentSlotDate = new Date(rescheduleApt.scheduled_at);
          const currentLagos = new Date(currentSlotDate.getTime() + (1 * 60 * 60 * 1000));
          let ch = currentLagos.getUTCHours();
          const cm = currentLagos.getUTCMinutes();
          const campm = ch >= 12 ? 'PM' : 'AM';
          ch = ch % 12;
          ch = ch ? ch : 12;
          const currentLabel = `${ch < 10 ? '0' + ch : String(ch)}:${cm < 10 ? '0' + cm : String(cm)} ${campm}`;
          setBookedSlots(fetchedBooked.filter(l => l !== currentLabel));
        } else {
          setBookedSlots(fetchedBooked);
        }
      });
    } else {
      setAllSlots([]);
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

  async function handleCancelConfirm() {
    if (!cancelApt) return;
    setIsCancelling(true);
    setCancelError(null);
    const result = await cancelAppointmentPatient(cancelApt.id);
    if (result.success) {
      setCancelApt(null);
      await loadAppointments();
    } else {
      setCancelError(result.error || 'Failed to cancel appointment.');
    }
    setIsCancelling(false);
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
        <p>Loading your medical schedule...</p>
      </div>
    );
  }

  // Segment appointments
  const upcomingAppointments = appointments.filter(
    apt => new Date(apt.scheduled_at) >= new Date() && apt.status !== 'cancelled'
  );

  const pastAppointments = appointments.filter(
    apt => new Date(apt.scheduled_at) < new Date() || apt.status === 'completed' || apt.status === 'cancelled'
  );

  const activeAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring" as const, stiffness: 120, damping: 14 }
    }
  };

  return (
    <div className={styles.page}>
      {paymentSuccessMsg && (
        <div className={styles.successBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} />
            <span>{paymentSuccessMsg}</span>
          </div>
          <button onClick={() => setPaymentSuccessMsg(null)}>×</button>
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h1>My Appointments</h1>
          <p>View and manage your upcoming consultations and care history</p>
        </div>
        <Link href="/book" className={styles.bookBtn}>
          <Calendar size={18} />
          Book New Consultation
        </Link>
      </div>

      {/* Tabs */}
      <div className={styles.tabSection}>
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'upcoming' ? styles.activeTab : ""}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Consultations
            {upcomingAppointments.length > 0 && (
              <span className={styles.tabCount}>{upcomingAppointments.length}</span>
            )}
            {activeTab === 'upcoming' && (
              <motion.div layoutId="activeTabIndicator" className={styles.tabIndicator} />
            )}
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'past' ? styles.activeTab : ""}`}
            onClick={() => setActiveTab('past')}
          >
            Care History
            {activeTab === 'past' && (
              <motion.div layoutId="activeTabIndicator" className={styles.tabIndicator} />
            )}
          </button>
        </div>
      </div>

      {/* Main Listing Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="hidden"
          className={styles.listWrapper}
        >
          {activeAppointments.length === 0 ? (
            <motion.div className={styles.emptyState} variants={cardVariants}>
              <div className={styles.emptyIconWrap}>
                {activeTab === 'upcoming' ? <Calendar size={36} /> : <Clock size={36} />}
              </div>
              <h3>No appointments found</h3>
              <p>
                {activeTab === 'upcoming' 
                  ? "You have no scheduled care sessions on our calendar." 
                  : "Your care history is currently clear."}
              </p>
              {activeTab === 'upcoming' && (
                <Link href="/book" className={styles.emptyActionBtn}>
                  Schedule Now
                </Link>
              )}
            </motion.div>
          ) : (
            <div className={activeTab === 'upcoming' ? styles.cardsGrid : styles.pastList}>
              {activeAppointments.map((apt) => {
                const docName = apt.doctor?.full_name || null;
                const docSpecialty = apt.doctor?.specialty || apt.service || 'General Practice';
                const initials = docName ? docName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'HP';

                return activeTab === 'upcoming' ? (
                  <motion.div 
                    key={apt.id} 
                    className={styles.appointmentCard}
                    variants={cardVariants}
                    whileHover={{ y: -3, scale: 1.01 }}
                  >
                    <div className={styles.cardHeader}>
                      <span className={apt.type === 'telemedicine' ? styles.badgeVirtual : styles.badgeClinic}>
                        {apt.type === 'telemedicine' ? 'Virtual' : 'In-Clinic'}
                      </span>
                      <div className={styles.headerBadges}>
                        {apt.payment_status === 'unpaid' && apt.type === 'telemedicine' && (
                          <span className={styles.unpaidBadge}>Unpaid</span>
                        )}
                        <span className={styles.statusBadge} data-status={apt.status}>
                          {apt.status}
                        </span>
                      </div>
                    </div>

                    <div className={styles.cardBody}>
                      {/* Doctor Profile Sub-card */}
                      <div className={styles.doctorBlock}>
                        <div className={styles.doctorAvatar}>
                          {initials}
                        </div>
                        <div className={styles.doctorInfo}>
                          <h4>{docName || 'Attending Physician'}</h4>
                          <p>{docSpecialty}</p>
                        </div>
                      </div>

                      <div className={styles.dateTimeWrapper}>
                        <div className={styles.dateTimeChip}>
                          <Calendar size={14} />
                          <span>{new Date(apt.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className={styles.dateTimeChip}>
                          <Clock size={14} />
                          <span>{new Date(apt.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {apt.type === 'telemedicine' && apt.meet_link && (
                        <a href={apt.meet_link} target="_blank" rel="noopener noreferrer" className={styles.joinBtn}>
                          <Video size={16} />
                          Join Video Consultation
                        </a>
                      )}
                      
                      {apt.type === 'telemedicine' && !apt.meet_link && apt.payment_status === 'unpaid' && (
                        <button 
                          className={styles.payBtn}
                          onClick={() => {
                            if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
                              alert('Payment system is not configured. Please contact support.');
                              return;
                            }
                            setIsPaying(true);
                            setPayConfig({
                              reference: `MHC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                              email: apt.patient_email,
                              amount: (apt.amount || 200) * 100, // in kobo
                              publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
                              appointmentId: apt.id
                            });
                          }}
                        >
                          <Receipt size={16} />
                          Pay Consultation Fee (NGN {(apt.amount || 200).toLocaleString()})
                        </button>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      <button className={styles.detailsBtn} onClick={() => handleViewDetails(apt)}>
                        View Details
                      </button>
                      {(apt.status === 'pending' || apt.status === 'confirmed') && new Date(apt.scheduled_at) > new Date() && (
                        <>
                          <button className={styles.rescheduleBtn} onClick={() => openReschedule(apt)}>
                            <RefreshCw size={13} />
                            Reschedule
                          </button>
                          <button 
                            className={styles.cancelActionBtn} 
                            onClick={() => {
                              setCancelApt(apt);
                              setCancelError(null);
                            }}
                            title="Cancel Consultation"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key={apt.id} 
                    className={styles.pastItem}
                    variants={cardVariants}
                    onClick={() => handleViewDetails(apt)}
                    whileHover={{ x: 4 }}
                  >
                    <div className={styles.pastMainInfo}>
                      <span className={apt.type === 'telemedicine' ? styles.badgeVirtual : styles.badgeClinic}>
                        {apt.type === 'telemedicine' ? 'Virtual' : 'Clinic'}
                      </span>
                      <div className={styles.pastDoctorMeta}>
                        <strong>{docName || 'Attending Physician'}</strong>
                        <span className={styles.pastSpecialty}>{docSpecialty}</span>
                      </div>
                      <span className={styles.pastDate}>
                        {new Date(apt.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className={styles.pastRightMeta}>
                      <span className={styles.pastStatus} data-status={apt.status}>{apt.status}</span>
                      <div className={styles.pastActionIcons}>
                        {apt.status === 'completed' && <span title="Encounter Notes Available"><FileText size={16} /></span>}
                        {apt.payment_status === 'paid' && <span title="Payment Invoice Available"><Receipt size={16} /></span>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Appointment Details Modal */}
      <AnimatePresence>
        {selectedApt && (
          <div className={styles.modalOverlay} onClick={() => setSelectedApt(null)}>
            <motion.div 
              className={styles.modal} 
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.35 }}
            >
              <div className={styles.modalHeader}>
                <h2>Encounter Summary</h2>
                <button onClick={() => setSelectedApt(null)} className={styles.modalCloseX}>×</button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.careSummaryCard}>
                  <div className={styles.careSummaryAvatar}>
                    {selectedApt.doctor?.full_name ? selectedApt.doctor.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'HP'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 className={styles.careDocName}>{selectedApt.doctor?.full_name || 'Attending Care Provider'}</h3>
                    <p className={styles.careDocSpecialty}>{selectedApt.doctor?.specialty || selectedApt.service || 'General Consultation'}</p>
                  </div>
                  <span className={selectedApt.type === 'telemedicine' ? styles.badgeVirtual : styles.badgeClinic}>
                    {selectedApt.type === 'telemedicine' ? 'Virtual' : 'In-Clinic'}
                  </span>
                </div>

                <div className={styles.infoGrid}>
                  <div className={styles.infoCol}>
                    <span className={styles.detailLabel}>Schedule Timestamp</span>
                    <span className={styles.detailVal}>
                      {new Date(selectedApt.scheduled_at).toLocaleString('en-US', {
                        weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className={styles.infoCol}>
                    <span className={styles.detailLabel}>Consultation Status</span>
                    <span className={styles.statusBadge} data-status={selectedApt.status}>{selectedApt.status}</span>
                  </div>
                </div>

                {selectedApt.payment_status && (
                  <div className={styles.receiptCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className={styles.receiptHeader}>Care Fee Receipt</span>
                      <span className={selectedApt.payment_status === 'paid' ? styles.receiptPaidBadge : styles.receiptUnpaidBadge}>
                        {selectedApt.payment_status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      <span>Consultation Service Amount</span>
                      <strong>NGN {selectedApt.amount ? selectedApt.amount.toLocaleString() : '200'}</strong>
                    </div>
                    {selectedApt.paystack_ref && (
                      <div className={styles.receiptRef}>
                        <span>Reference: {selectedApt.paystack_ref}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Encounter Notes */}
                <div className={styles.notesSection}>
                  <h3>
                    <FileText size={16} />
                    Encounter Diagnostics & Notes
                  </h3>
                  {clinicalNotes.length === 0 ? (
                    <div className={styles.emptyNotesBlock}>
                      <HelpCircle size={28} />
                      <p>Clinical logs are currently pending for this care session.</p>
                    </div>
                  ) : (
                    <div className={styles.notesList}>
                      {clinicalNotes.map((note: any) => (
                        <div key={note.id} className={styles.noteCard}>
                          <p className={note.content ? styles.noteContent : styles.emptyNoteContent}>
                            {note.content || "Encounter log has not been filed yet."}
                          </p>
                          <div className={styles.noteSignature}>
                            <span className={styles.sigLine} />
                            <span className={styles.sigAuthor}>{note.author_name}</span>
                            <span className={styles.sigTitle}>Licensed Care Practitioner</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Safety Cancellation Modal */}
      <AnimatePresence>
        {cancelApt && (
          <div className={styles.modalOverlay} onClick={() => setCancelApt(null)}>
            <motion.div 
              className={styles.cancelConfirmModal}
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className={styles.cancelAlertIcon}>
                <ShieldAlert size={28} />
              </div>
              <h2>Cancel Consultation?</h2>
              <p>
                Are you sure you want to cancel your consultation with <strong>{cancelApt.doctor?.full_name || "Attending Physician"}</strong> on <strong>{new Date(cancelApt.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(cancelApt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>?
              </p>
              
              <div className={styles.cancelModalAdvice}>
                <AlertCircle size={14} />
                <span>This slot will be immediately released to other patients. A cancellation notification will be dispatched.</span>
              </div>

              {cancelError && (
                <p className={styles.modalErrorMsg}>{cancelError}</p>
              )}

              <div className={styles.cancelModalActions}>
                <button 
                  className={styles.modalSecondaryBtn} 
                  onClick={() => setCancelApt(null)}
                  disabled={isCancelling}
                >
                  Keep Booking
                </button>
                <button 
                  className={styles.modalCancelConfirmBtn}
                  onClick={handleCancelConfirm}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <><Loader2 size={14} className={styles.spinner} /> Cancelling...</>
                  ) : (
                    "Cancel Appointment"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleApt && (
          <div className={styles.modalOverlay} onClick={() => setRescheduleApt(null)}>
            <motion.div 
              className={styles.modal} 
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className={styles.modalHeader}>
                <h2>Reschedule Appointment</h2>
                <button onClick={() => setRescheduleApt(null)} className={styles.modalCloseX}>×</button>
              </div>

              <div className={styles.modalBody}>
                <p className={styles.rescheduleSubtitle}>
                  Rescheduling consultation with: <strong>{rescheduleApt.doctor?.full_name || "Attending Care Provider"}</strong>
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
                <AnimatePresence>
                  {rescheduleDate && (
                    <motion.div 
                      className={styles.rescheduleSlots}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <h4 className={styles.slotsHeader}>
                        Available times for {rescheduleDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </h4>

                      <div className={styles.slotGroup}>
                        <span className={styles.slotGroupLabel}>Morning Block</span>
                        <div className={styles.slotGrid}>
                          {allSlots.filter(s => s.endsWith('AM')).map(slotLabel => {
                            const now = new Date();
                            const isToday = rescheduleDate.toDateString() === now.toDateString();
                            let isPast = false;
                            if (isToday) {
                              const [t, mod] = slotLabel.split(" ");
                              let [h, m] = t.split(":").map(Number);
                              if (mod === "PM" && h !== 12) h += 12;
                              if (mod === "AM" && h === 12) h = 0;
                              const st = new Date(); st.setHours(h, m, 0, 0);
                              isPast = st < now;
                            }
                            const isBooked = bookedSlots.includes(slotLabel);
                            const available = !isPast && !isBooked;

                            return available ? (
                              <button
                                key={slotLabel}
                                type="button"
                                className={`${styles.slotPill} ${rescheduleTime === slotLabel ? styles.slotPillSelected : ""}`}
                                onClick={() => setRescheduleTime(slotLabel)}
                              >
                                {slotLabel}
                              </button>
                            ) : (
                              <button key={slotLabel} type="button" className={`${styles.slotPill} ${styles.slotPillDisabled}`} disabled>
                                {slotLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className={styles.slotGroup}>
                        <span className={styles.slotGroupLabel}>Afternoon Block</span>
                        <div className={styles.slotGrid}>
                          {allSlots.filter(s => s.endsWith('PM')).map(slotLabel => {
                            const now = new Date();
                            const isToday = rescheduleDate.toDateString() === now.toDateString();
                            let isPast = false;
                            if (isToday) {
                              const [t, mod] = slotLabel.split(" ");
                              let [h, m] = t.split(":").map(Number);
                              if (mod === "PM" && h !== 12) h += 12;
                              if (mod === "AM" && h === 12) h = 0;
                              const st = new Date(); st.setHours(h, m, 0, 0);
                              isPast = st < now;
                            }
                            const isBooked = bookedSlots.includes(slotLabel);
                            const available = !isPast && !isBooked;

                            return available ? (
                              <button
                                key={slotLabel}
                                type="button"
                                className={`${styles.slotPill} ${rescheduleTime === slotLabel ? styles.slotPillSelected : ""}`}
                                onClick={() => setRescheduleTime(slotLabel)}
                              >
                                {slotLabel}
                              </button>
                            ) : (
                              <button key={slotLabel} type="button" className={`${styles.slotPill} ${styles.slotPillDisabled}`} disabled>
                                {slotLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {rescheduleError && (
                  <p className={styles.modalErrorMsg}>{rescheduleError}</p>
                )}

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalSecondaryBtn}
                    onClick={() => setRescheduleApt(null)}
                    disabled={isRescheduling}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    className={styles.modalPrimaryBtn}
                    disabled={!rescheduleDate || !rescheduleTime || isRescheduling}
                    onClick={handleRescheduleConfirm}
                  >
                    {isRescheduling ? (
                      <><Loader2 size={16} className={styles.spinner} /> Saving...</>
                    ) : (
                      <><RefreshCw size={14} /> Confirm Reschedule</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
