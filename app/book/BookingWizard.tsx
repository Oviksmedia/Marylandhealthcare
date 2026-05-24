"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  HeartPulse,
  Home,
  Loader2,
  Lock,
  Microscope,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Video,
  X,
  Eye,
  EyeOff,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { usePaystackPayment } from "react-paystack";
import {
  getBookedSlots,
  createPendingBooking,
  confirmBooking,
  registerPatientUser,
  checkFollowUpEligibility
} from "@/app/lib/telemedicine/booking";
import { getSupabaseBrowserClient } from "@/app/lib/supabase";
import { format } from "date-fns";
import styles from "./book.module.css";
import { PRICING_CONSTANTS } from "@/app/lib/telemedicine/pricing";

type Step = 1 | 2 | 3 | 4 | 5;
type Modality = "in-clinic" | "telemedicine";
type PatientType = "new" | "returning";

interface BookingState {
  step: Step;
  modality: Modality | null;
  service: string | null;
  date: Date | null;
  timeSlot: string | null;
  patientType: PatientType;
  isFollowUp: boolean;
  patientDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    reason: string;
  };
}

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const services = [
  {
    name: "General Practice",
    description: "Routine check-ups and primary care.",
    Icon: Stethoscope,
  },
  {
    name: "Pediatrics",
    description: "Specialized care for infants and children.",
    Icon: Baby,
  },
  {
    name: "Maternity & Childbirth",
    description: "Antenatal, delivery, and postnatal care.",
    Icon: HeartPulse,
  },
  {
    name: "Internal Medicine",
    description: "Adult diagnosis and chronic care planning.",
    Icon: UserRound,
  },
  {
    name: "Diagnostic Laboratory",
    description: "Fast investigations and result review.",
    Icon: Microscope,
  },
  {
    name: "Mental Health",
    description: "Private counseling and psychiatric support.",
    Icon: ShieldCheck,
  },
];

const morningSlots = [
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
];

const afternoonSlots = [
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isWeekend(year: number, month: number, day: number) {
  const dayOfWeek = new Date(year, month, day).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function isPastDate(year: number, month: number, day: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(year, month, day);
  return date < today;
}

function formatDate(date: Date | null) {
  if (!date) {
    return "No date selected";
  }
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BookingWizard() {
  const supabase = getSupabaseBrowserClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [bookingVersion, setBookingVersion] = useState(0);
  const [pendingAppointmentId, setPendingAppointmentId] = useState<string | null>(null);
  const [confirmedMeetLink, setConfirmedMeetLink] = useState<string | null>(null);

  // Form inputs and auth
  const [patientPassword, setPatientPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Follow-up validation
  const [isCheckingFollowUp, setIsCheckingFollowUp] = useState(false);
  const [isFollowUpEligible, setIsFollowUpEligible] = useState(false);

  // Telemedicine consent modal
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap for consent modal
  useEffect(() => {
    if (!isConsentModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsConsentModalOpen(false);
        setConsentAgreed(false);
        return;
      }
      if (e.key !== "Tab") return;
      if (!modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    // Focus the first button in the modal on open
    setTimeout(() => {
      if (modalRef.current) {
        const firstButton = modalRef.current.querySelector('button');
        firstButton?.focus();
      }
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isConsentModalOpen]);

  const [state, setState] = useState<BookingState>({
    step: 1,
    modality: "in-clinic",
    service: null,
    date: null,
    timeSlot: null,
    patientType: "new",
    isFollowUp: false,
    patientDetails: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      reason: "",
    },
  });

  // Calculate pricing dynamic and WAT-safe
  const price = useMemo(() => {
    if (state.modality === "in-clinic") return 0;
    const base = state.service === "Mental Health" ? PRICING_CONSTANTS.mentalHealth : PRICING_CONSTANTS.generalPractice;
    if (state.isFollowUp && isFollowUpEligible) {
      return base / 2;
    }
    return base;
  }, [state.modality, state.service, state.isFollowUp, isFollowUpEligible]);

  const availableSpecialties = useMemo(() => {
    if (state.modality === "telemedicine") {
      return [
        {
          name: "General Practice",
          description: "Routine check-ups and primary care.",
          Icon: Stethoscope,
          price: state.isFollowUp && isFollowUpEligible ? PRICING_CONSTANTS.generalPractice / 2 : PRICING_CONSTANTS.generalPractice,
        },
        {
          name: "Mental Health",
          description: "Private counseling and psychiatric support.",
          Icon: ShieldCheck,
          price: state.isFollowUp && isFollowUpEligible ? PRICING_CONSTANTS.mentalHealth / 2 : PRICING_CONSTANTS.mentalHealth,
        },
      ];
    }
    return services.map(s => ({ ...s, price: null }));
  }, [state.modality, state.isFollowUp, isFollowUpEligible]);

  // Check passive session on mount
  useEffect(() => {
    async function checkActiveSession() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user && user.email) {
        const email = user.email.toLowerCase().trim();

        // Check appointments first to autofill details
        const { data: appointments } = await supabase
          .from("appointments")
          .select("patient_name, patient_phone")
          .eq("patient_email", email)
          .order("scheduled_at", { ascending: false })
          .limit(1);

        let firstName = "";
        let lastName = "";
        let phone = "";

        if (appointments && appointments.length > 0) {
          const parts = (appointments[0].patient_name || "").split(" ");
          firstName = parts[0] || "";
          lastName = parts.slice(1).join(" ") || "";
          phone = appointments[0].patient_phone || "";
        } else {
          // Fallback to profiles
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("email", email)
            .limit(1);

          if (profile && profile.length > 0) {
            const parts = (profile[0].full_name || "").split(" ");
            firstName = parts[0] || "";
            lastName = parts.slice(1).join(" ") || "";
            phone = profile[0].phone || "";
          }
        }

        // Validate follow-up eligibility immediately
        setIsCheckingFollowUp(true);
        const followUp = await checkFollowUpEligibility(email);
        setIsFollowUpEligible(followUp.eligible);
        setIsCheckingFollowUp(false);

        setState((current) => ({
          ...current,
          patientType: "returning",
          patientDetails: {
            ...current.patientDetails,
            email,
            firstName: firstName || "Patient",
            lastName: lastName || "",
            phone: phone || "",
          },
        }));
        setLoginSuccess(true);
      }
    }
    checkActiveSession();
  }, [supabase]);

  // Fetch booked slots strictly based on UTC bounds aligned to WAT timezones
  useEffect(() => {
    if (state.date) {
      const dateStr = format(state.date, "yyyy-MM-dd");
      getBookedSlots(dateStr)
        .then((timestamps) => {
          // Aligns slots inside UTC+1 Lagos boundaries globally
          const labels = timestamps.map((ts) => {
            const dateObj = new Date(ts);
            const lagosTime = new Date(dateObj.getTime() + 1 * 60 * 60 * 1000);
            let hours = lagosTime.getUTCHours();
            const minutes = lagosTime.getUTCMinutes();
            const ampm = hours >= 12 ? "PM" : "AM";
            hours = hours % 12;
            hours = hours ? hours : 12;
            const minutesStr = minutes < 10 ? "0" + minutes : minutes;
            const hoursStr = hours < 10 ? "0" + hours : hours;
            return `${hoursStr}:${minutesStr} ${ampm}`;
          });
          setBookedSlots(labels);
        })
        .catch((err) => {
          console.error("Failed to load booked slots:", err);
          setBookedSlots([]); // Fallback to empty array
        });
    } else {
      setBookedSlots([]);
    }
  }, [state.date, bookingVersion]);

  // Calendar controls
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayOfWeek = getFirstDayOfWeek(calendarYear, calendarMonth);
  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, index) => index);

  const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const calendarMonthDate = new Date(calendarYear, calendarMonth, 1);
  const maxMonthDate = new Date(today.getFullYear(), today.getMonth() + 2, 1);
  const canGoPrev = calendarMonthDate > currentMonthDate;
  const canGoNext = calendarMonthDate < maxMonthDate;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function goToPrevMonth() {
    if (!canGoPrev) return;
    const newDate = new Date(calendarYear, calendarMonth - 1, 1);
    setCalendarMonth(newDate.getMonth());
    setCalendarYear(newDate.getFullYear());
  }

  function goToNextMonth() {
    if (!canGoNext) return;
    const newDate = new Date(calendarYear, calendarMonth + 1, 1);
    setCalendarMonth(newDate.getMonth());
    setCalendarYear(newDate.getFullYear());
  }

  // Password strength check
  const passwordStrength = useMemo(() => {
    if (!patientPassword) return 0;
    let score = 0;
    if (patientPassword.length >= 8) score++;
    if (/[a-zA-Z]/.test(patientPassword)) score++;
    if (/[0-9]/.test(patientPassword)) score++;
    return score;
  }, [patientPassword]);

  function generateSecurePassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPatientPassword(generated);
    setShowPassword(true);
  }

  const canContinue = useMemo(() => {
    if (state.step === 1) {
      return Boolean(state.service);
    }
    if (state.step === 2) {
      return Boolean(state.date && state.timeSlot);
    }
    if (state.step === 3) {
      if (state.patientType === "returning") {
        return loginSuccess;
      }
      return Boolean(
        state.patientDetails.firstName &&
        state.patientDetails.lastName &&
        state.patientDetails.email &&
        state.patientDetails.phone &&
        patientPassword &&
        passwordStrength >= 3
      );
    }
    return true;
  }, [state, loginSuccess, patientPassword, passwordStrength]);

  async function handleEmailBlur() {
    const email = state.patientDetails.email.toLowerCase().trim();
    if (!email || !email.includes("@")) return;

    try {
      setIsCheckingFollowUp(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1);

      if (profile && profile.length > 0) {
        setState(curr => ({ ...curr, patientType: "returning" }));
      }

      const followUp = await checkFollowUpEligibility(email);
      setIsFollowUpEligible(followUp.eligible);
      setIsCheckingFollowUp(false);
    } catch (e) {
      console.error(e);
      setIsCheckingFollowUp(false);
    }
  }

  async function handleLogin() {
    if (!state.patientDetails.email || !patientPassword) {
      setLoginError("Please fill in email and password.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: state.patientDetails.email.toLowerCase().trim(),
        password: patientPassword,
      });

      if (error) throw error;

      // Authenticated! Pull past name and phone to autofill
      const { data: appointments } = await supabase
        .from("appointments")
        .select("patient_name, patient_phone")
        .eq("patient_email", state.patientDetails.email.toLowerCase().trim())
        .order("scheduled_at", { ascending: false })
        .limit(1);

      let firstName = "";
      let lastName = "";
      let phone = "";

      if (appointments && appointments.length > 0) {
        const parts = (appointments[0].patient_name || "").split(" ");
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
        phone = appointments[0].patient_phone || "";
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("email", state.patientDetails.email.toLowerCase().trim())
          .limit(1);

        if (profile && profile.length > 0) {
          const parts = (profile[0].full_name || "").split(" ");
          firstName = parts[0] || "";
          lastName = parts.slice(1).join(" ") || "";
          phone = profile[0].phone || "";
        }
      }

      // Check follow-up eligibility on login
      setIsCheckingFollowUp(true);
      const followUp = await checkFollowUpEligibility(state.patientDetails.email);
      setIsFollowUpEligible(followUp.eligible);
      setIsCheckingFollowUp(false);

      setState((curr) => ({
        ...curr,
        patientDetails: {
          ...curr.patientDetails,
          firstName: firstName || "Patient",
          lastName: lastName || "",
          phone: phone || "",
        },
      }));
      setLoginSuccess(true);
    } catch (e: any) {
      setLoginError(e.message || "Invalid credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  // Paystack configurations
  const [paystackReference, setPaystackReference] = useState("");

  useEffect(() => {
    if (state.step === 4 && !paystackReference) {
      setPaystackReference(`MHC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
    } else if (state.step !== 4 && paystackReference) {
      setPaystackReference("");
    }
  }, [state.step, paystackReference]);

  const paystackConfig = useMemo(() => ({
    reference: paystackReference,
    email: state.patientDetails.email.toLowerCase().trim(),
    amount: price * 100, // in kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
  }), [paystackReference, state.patientDetails.email, price]);

  const initializePayment = usePaystackPayment(paystackConfig);

  async function handleProceedToSecurePayment() {
    setCheckoutError(null);
    if (state.modality === "telemedicine" && !process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      setCheckoutError('Payment system is not configured. Please contact support.');
      return;
    }

    if (!canContinue || !state.date || !state.timeSlot) return;

    setIsSubmitting(true);
    try {
      // 1. If new patient, register their account first
      if (state.patientType === "new" && !loginSuccess) {
        const reg = await registerPatientUser({
          email: state.patientDetails.email.toLowerCase().trim(),
          password: patientPassword,
          fullName: `${state.patientDetails.firstName} ${state.patientDetails.lastName}`,
          phone: state.patientDetails.phone,
        });

        if (!reg.success) {
          setCheckoutError(`Registration failed: ${reg.error}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Resolve booking time in WAT-safe ISO
      const [time, ampm] = state.timeSlot.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      // Save scheduled timestamp aligned to Lagos day hour offsets
      const scheduledDate = new Date(state.date);
      scheduledDate.setHours(hours, minutes, 0, 0);

      // Create a pending booking first
      const pending = await createPendingBooking({
        patientName: `${state.patientDetails.firstName} ${state.patientDetails.lastName}`,
        patientEmail: state.patientDetails.email.toLowerCase().trim(),
        patientPhone: state.patientDetails.phone,
        type: state.modality === "in-clinic" ? "in_clinic" : "telemedicine",
        scheduledAt: scheduledDate.toISOString(),
        description: state.patientDetails.reason,
        amount: price,
        service: state.service,
        isNewPatient: state.patientType === "new" && !loginSuccess,
        consentAgreedAt: state.modality === "telemedicine" ? new Date().toISOString() : undefined,
        isFollowUp: state.isFollowUp && isFollowUpEligible,
      });

      if (!pending.success) {
        setCheckoutError(pending.error || "Failed to schedule pending slot.");
        setIsSubmitting(false);
        return;
      }

      setPendingAppointmentId(pending.appointmentId);

      // 4. Initialize Paystack checkout or complete standard free in-clinic
      if (state.modality === "telemedicine") {
        initializePayment({
          onSuccess: async (ref: any) => {
            const confirmed = await confirmBooking(pending.appointmentId, ref.reference, new Date().toISOString());
            if (confirmed.success) {
              setConfirmedMeetLink(confirmed.meetLink || null);
              setBookingVersion(v => v + 1);
              setState(curr => ({ ...curr, step: 5 }));
            } else {
              setCheckoutError(confirmed.error || "Payment confirmation failed.");
            }
            setIsSubmitting(false);
          },
          onClose: () => {
            setCheckoutError("Payment was closed. Slot remains reserved for 10 minutes.");
            setIsSubmitting(false);
          }
        });
      } else {
        const confirmed = await confirmBooking(pending.appointmentId);
        if (confirmed.success) {
          setConfirmedMeetLink(confirmed.meetLink || null);
          setBookingVersion(v => v + 1);
          setState(curr => ({ ...curr, step: 5 }));
        } else {
          setCheckoutError(confirmed.error || "Failed to confirm appointment.");
        }
        setIsSubmitting(false);
      }
    } catch (e: any) {
      console.error(e);
      setCheckoutError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  function renderTimeSlots(title: string, slots: string[]) {
    const now = new Date();
    const isToday = state.date?.toDateString() === now.toDateString();

    return (
      <div className={styles.timeGroup}>
        <div className={styles.timeHeader}>
          <CalendarDays aria-hidden size={20} />
          <h3>{title}</h3>
        </div>
        <div className={styles.timeGrid}>
          {slots.map((slot) => {
            let isPast = false;
            if (isToday) {
              const [time, modifier] = slot.split(" ");
              let [hours, minutes] = time.split(":").map(Number);
              if (modifier === "PM" && hours !== 12) hours += 12;
              if (modifier === "AM" && hours === 12) hours = 0;

              const slotTime = new Date();
              slotTime.setHours(hours, minutes, 0, 0);
              isPast = slotTime < now;
            }

            const isBooked = bookedSlots.includes(slot);
            const available = !isPast && !isBooked;

            return available ? (
              <button
                className={`${styles.timePill} ${state.timeSlot === slot ? styles.selectedTime : ""}`}
                key={slot}
                onClick={() => setState((curr) => ({ ...curr, timeSlot: slot }))}
                type="button"
              >
                {slot}
              </button>
            ) : (
              <button className={`${styles.timePill} ${styles.bookedTime}`} disabled key={slot} type="button">
                {slot}
                <Lock aria-hidden size={14} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <button disabled={state.step === 1 || state.step === 5} onClick={() => setState(c => ({ ...c, step: (c.step - 1) as Step }))} type="button">
          <ArrowLeft aria-hidden size={19} />
          <span>Back</span>
        </button>
        <Link className={styles.brand} href="/">
          Maryland Healthcare
        </Link>
        <Link aria-label="Close booking flow" href="/">
          <X aria-hidden size={22} />
        </Link>
      </header>

      <section className={styles.shell} aria-labelledby="booking-heading">
        <div className={styles.stepIntro}>
          <p>Step {state.step} of 5</p>
          <h1 id="booking-heading">
            {state.step === 1 ? "Book an Appointment" : null}
            {state.step === 2 ? "When would you like to visit?" : null}
            {state.step === 3 ? "Your Details" : null}
            {state.step === 4 ? "Review & Confirm" : null}
            {state.step === 5 ? "Consultation Confirmed." : null}
          </h1>
          <div className={styles.progressTrack} role="progressbar" aria-valuenow={state.step} aria-valuemin={1} aria-valuemax={5}>
            <span style={{ width: `${(state.step / 5) * 100}%` }} />
          </div>
        </div>

        {state.step === 1 && (
          <motion.div animate={{ opacity: 1, y: 0 }} className={styles.stepPanel} initial={{ opacity: 0, y: 15 }} transition={{ duration: 0.45, ease }}>
            <div className={styles.modalityGrid}>
              <button
                className={`${styles.modalityCard} ${state.modality === "in-clinic" ? styles.selectedCard : ""}`}
                onClick={() => setState((curr) => ({ ...curr, modality: "in-clinic", isFollowUp: false }))}
                type="button"
                aria-pressed={state.modality === "in-clinic"}
              >
                <span className={styles.iconCircle}>
                  <Building2 aria-hidden size={30} />
                </span>
                <strong>In-Clinic Visit</strong>
                <span>Schedule a face-to-face consultation at our Port Harcourt facility.</span>
              </button>
              <button
                className={`${styles.modalityCard} ${styles.virtualCard} ${state.modality === "telemedicine" ? styles.selectedVirtual : ""}`}
                onClick={() => setState((curr) => {
                  const nextService = (curr.service === "General Practice" || curr.service === "Mental Health") ? curr.service : null;
                  return { ...curr, modality: "telemedicine", service: nextService };
                })}
                type="button"
                aria-pressed={state.modality === "telemedicine"}
              >
                <span className={styles.iconCircle}>
                  <Video aria-hidden size={30} />
                </span>
                <strong>Virtual Consultation</strong>
                <span>Connect securely with our trusted doctors from home.</span>
              </button>
            </div>

            {state.modality === "telemedicine" && (
              <div className={styles.consentCard}>
                <label className={styles.consentCheckboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.consentCheckboxInput}
                    checked={state.isFollowUp}
                    onChange={(e) => setState(curr => ({ ...curr, isFollowUp: e.target.checked }))}
                  />
                  <span className={styles.consentText}>
                    This is a <strong>Follow-Up Consultation</strong> (Requires a completed consult within the last 30 days. You save 50%!)
                  </span>
                </label>
              </div>
            )}

            <div className={styles.serviceHeader}>
              <h2>Select a Specialty</h2>
            </div>
            <div className={styles.serviceGrid}>
              {availableSpecialties.map(({ Icon, description, name, price }) => (
                <button
                  className={`${styles.serviceCard} ${state.service === name ? styles.selectedService : ""}`}
                  key={name}
                  onClick={() => setState((curr) => ({ ...curr, service: name }))}
                  type="button"
                  aria-pressed={state.service === name}
                >
                  <Icon aria-hidden size={24} />
                  <span>
                    <strong>{name}</strong>
                    {price !== null && (
                      <em className={styles.priceDisplay}>
                        NGN {price.toLocaleString()}
                      </em>
                    )}
                    <em>{description}</em>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {state.step === 2 && (
          <motion.div animate={{ opacity: 1, y: 0 }} className={`${styles.stepPanel} ${styles.dateTimeGrid}`} initial={{ opacity: 0, y: 15 }} transition={{ duration: 0.45, ease }}>
            <section className={styles.calendar}>
              <div className={styles.calendarHeader}>
                <button aria-label="Previous month" onClick={goToPrevMonth} disabled={!canGoPrev} type="button">
                  <ArrowLeft aria-hidden size={18} />
                </button>
                <h2>{monthNames[calendarMonth]} {calendarYear}</h2>
                <button aria-label="Next month" onClick={goToNextMonth} disabled={!canGoNext} type="button">
                  <ArrowRight aria-hidden size={18} />
                </button>
              </div>
              <div className={styles.weekdays}>
                {[
                  { abbrev: "S", full: "Sunday" },
                  { abbrev: "M", full: "Monday" },
                  { abbrev: "T", full: "Tuesday" },
                  { abbrev: "W", full: "Wednesday" },
                  { abbrev: "T", full: "Thursday" },
                  { abbrev: "F", full: "Friday" },
                  { abbrev: "S", full: "Saturday" }
                ].map((day, idx) => (
                  <span key={`${day.abbrev}-${idx}`} aria-label={day.full}>{day.abbrev}</span>
                ))}
              </div>
              <div className={styles.daysGrid}>
                {emptyDays.map((_, idx) => (
                  <span key={`empty-${idx}`} />
                ))}
                {calendarDays.map((day) => {
                  const isPast = isPastDate(calendarYear, calendarMonth, day);
                  const weekend = isWeekend(calendarYear, calendarMonth, day);
                  const disabled = isPast || weekend;
                  const selected = state.date?.getDate() === day && state.date?.getMonth() === calendarMonth && state.date?.getFullYear() === calendarYear;

                  return (
                    <button
                      className={`${styles.dayButton} ${selected ? styles.selectedDay : ""}`}
                      disabled={disabled}
                      key={day}
                      onClick={() => setState((curr) => ({ ...curr, date: new Date(calendarYear, calendarMonth, day) }))}
                      type="button"
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={styles.timeColumn}>
              {renderTimeSlots("Morning Sessions", morningSlots)}
              {renderTimeSlots("Afternoon Sessions", afternoonSlots)}
            </section>
          </motion.div>
        )}

        {state.step === 3 && (
          <motion.div animate={{ opacity: 1, y: 0 }} className={`${styles.stepPanel} ${styles.detailsGrid}`} initial={{ opacity: 0, y: 15 }} transition={{ duration: 0.45, ease }}>
            <section className={styles.detailsForm}>
              {loginSuccess ? (
                <>
                  <div className={styles.profileCard}>
                    <UserCheck size={24} className={styles.profileCardIcon} />
                    <div className={styles.profileCardInfo}>
                      <h3>Profile Connected</h3>
                      <p>
                        Logged in as <strong>{state.patientDetails.firstName} {state.patientDetails.lastName}</strong> ({state.patientDetails.email})
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.changeAccountBtn}
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setLoginSuccess(false);
                        setPatientPassword("");
                        setState((curr) => ({
                          ...curr,
                          patientDetails: {
                            firstName: "",
                            lastName: "",
                            email: "",
                            phone: "",
                            reason: "",
                          },
                        }));
                      }}
                    >
                      Sign Out
                    </button>
                  </div>

                  <div className={`${styles.formGrid} ${styles.formGridSpacing}`}>
                    <label className={styles.fullWidth}>
                      <span>Reason for Visit</span>
                      <textarea
                        rows={3}
                        value={state.patientDetails.reason}
                        onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, reason: e.target.value } }))}
                      />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.patientToggle}>
                    {(["new", "returning"] as PatientType[]).map((type) => (
                      <button
                        className={state.patientType === type ? styles.activePatientType : ""}
                        key={type}
                        onClick={() => setState((curr) => ({ ...curr, patientType: type }))}
                        type="button"
                      >
                        {type === "new" ? "New Patient" : "Returning Patient"}
                      </button>
                    ))}
                  </div>

                  <div className={styles.formGrid}>
                    {state.patientType === "returning" ? (
                      <>
                        <label className={styles.fullWidth}>
                          <span>Registered Email Address</span>
                          <input
                            type="email"
                            required
                            value={state.patientDetails.email}
                            onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, email: e.target.value } }))}
                            onBlur={handleEmailBlur}
                          />
                        </label>
                        <label className={styles.fullWidth}>
                          <span>Secure Password</span>
                          <div className={styles.passwordWrapper}>
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={patientPassword}
                              onChange={(e) => setPatientPassword(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className={styles.passwordToggle}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </label>

                        {loginError && (
                          <p className={styles.loginError}>❌ {loginError}</p>
                        )}

                        <button
                          type="button"
                          disabled={isLoggingIn}
                          onClick={handleLogin}
                          className={styles.loginBtn}
                        >
                          {isLoggingIn ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Logging in...</span>
                            </>
                          ) : (
                            <span>Login & Auto-fill Details</span>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <label>
                          <span>First Name</span>
                          <input
                            type="text"
                            required
                            value={state.patientDetails.firstName}
                            onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, firstName: e.target.value } }))}
                          />
                        </label>
                        <label>
                          <span>Last Name</span>
                          <input
                            type="text"
                            required
                            value={state.patientDetails.lastName}
                            onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, lastName: e.target.value } }))}
                          />
                        </label>
                        <label>
                          <span>Phone Number</span>
                          <input
                            type="tel"
                            required
                            value={state.patientDetails.phone}
                            onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, phone: e.target.value } }))}
                          />
                        </label>
                        <label>
                          <span>Email Address</span>
                          <input
                            type="email"
                            required
                            value={state.patientDetails.email}
                            onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, email: e.target.value } }))}
                            onBlur={handleEmailBlur}
                          />
                        </label>
                        <label className={styles.fullWidth}>
                          <span>Create Password (Letters & numbers, min 8 characters)</span>
                          <div className={styles.passwordWrapper}>
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={patientPassword}
                              onChange={(e) => setPatientPassword(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className={styles.passwordToggle}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          <div className={styles.passwordStrength}>
                            {[1, 2, 3].map((stepIdx) => (
                              <div
                                key={stepIdx}
                                className={`${styles.passwordStrengthStep} ${passwordStrength >= stepIdx ? (passwordStrength === 3 ? styles.strong : styles.active) : ""}`}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={generateSecurePassword}
                            className={styles.generatePasswordBtn}
                          >
                            Generate Random Secure Password
                          </button>
                        </label>
                        <label className={styles.fullWidth}>
                          <span>Reason for Visit</span>
                          <textarea
                            rows={3}
                            value={state.patientDetails.reason}
                            onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, reason: e.target.value } }))}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </>
              )}
            </section>

            <aside className={styles.summaryColumn}>
              {state.modality === "telemedicine" ? (
                <div className={styles.paymentCard}>
                  <ShieldCheck aria-hidden size={30} />
                  <h2>Payment Summary</h2>
                  <div>
                    <span>Consultation Fee</span>
                    <strong>NGN {price.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Facility Charge</span>
                    <strong>Included</strong>
                  </div>
                  <hr />
                  <div className={styles.totalRow}>
                    <span>Total Due Today</span>
                    <strong>NGN {price.toLocaleString()}</strong>
                  </div>
                </div>
              ) : (
                <div className={styles.visitSummary}>
                  <h2>Appointment Summary</h2>
                  <p>Your in-clinic request will be reviewed by our care team for confirmation.</p>
                </div>
              )}

              {state.isFollowUp && (
                <div className={`${styles.followUpCard} ${isFollowUpEligible ? styles.eligible : styles.notEligible}`}>
                  {isCheckingFollowUp ? (
                    <div className={styles.followUpChecking}>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Checking follow-up eligibility...</span>
                    </div>
                  ) : isFollowUpEligible ? (
                    <span className={styles.followUpEligible}>✅ <strong>Eligible:</strong> Previous visit detected within 30 days! 50% discount applied.</span>
                  ) : (
                    <span className={styles.followUpNotEligible}>❌ <strong>Not Eligible:</strong> No completed visit found within the last 30 days. Standard fee will apply at check-out.</span>
                  )}
                </div>
              )}
            </aside>
          </motion.div>
        )}

        {state.step === 4 && (
          <motion.div animate={{ opacity: 1, y: 0 }} className={`${styles.stepPanel} ${styles.detailsGrid}`} initial={{ opacity: 0, y: 15 }} transition={{ duration: 0.45, ease }}>
            <section className={styles.detailsForm}>
              <h2>Review Your Appointment Information</h2>
              {checkoutError && (
                 <div className={styles.checkoutError}>
                   <div className={styles.checkoutErrorContent}>
                     <X size={20} style={{ flexShrink: 0 }} />
                     <span>{checkoutError}</span>
                   </div>
                   <button onClick={() => setCheckoutError(null)} className={styles.checkoutErrorDismiss} aria-label="Dismiss error">
                     <X size={16} />
                   </button>
                 </div>
               )}
              <div className={styles.reviewCard}>
                <div>
                  <strong>Specialty</strong>
                  <p className={styles.reviewValue}>{state.service}</p>
                </div>
                <div>
                  <strong>Type</strong>
                  <p className={styles.reviewValue}>
                    {state.modality === "telemedicine" ? "Virtual Consultation" : "In-Clinic Visit"}
                    {state.isFollowUp && isFollowUpEligible ? " (Follow-Up)" : ""}
                  </p>
                </div>
                <div>
                  <strong>Date</strong>
                  <p className={styles.reviewValue}>{formatDate(state.date)}</p>
                </div>
                <div>
                  <strong>Time Slot</strong>
                  <p className={styles.reviewValue}>{state.timeSlot}</p>
                </div>
                <hr className={styles.reviewDivider} />
                <div>
                  <strong>Patient Name</strong>
                  <p className={styles.reviewValueMuted}>{state.patientDetails.firstName} {state.patientDetails.lastName}</p>
                </div>
                <div>
                  <strong>Phone Number</strong>
                  <p className={styles.reviewFieldValue}>{state.patientDetails.phone}</p>
                </div>
                <div className={styles.fullWidth}>
                  <strong>Email Address</strong>
                  <p className={styles.reviewFieldValue}>{state.patientDetails.email}</p>
                </div>
                <div className={styles.fullWidth}>
                  <strong>Reason for Visit</strong>
                  <p className={styles.reviewFieldValueReason}>{state.patientDetails.reason}</p>
                </div>
              </div>
            </section>

            <aside className={styles.summaryColumn}>
              {state.modality === "telemedicine" ? (
                <div className={styles.paymentCard}>
                  <ShieldCheck aria-hidden size={30} />
                  <h2>Payment Summary</h2>
                  <div>
                    <span>Consultation Fee</span>
                    <strong>NGN {price.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Facility Charge</span>
                    <strong>Included</strong>
                  </div>
                  <hr />
                  <div className={styles.totalRow}>
                    <span>Total Due Today</span>
                    <strong>NGN {price.toLocaleString()}</strong>
                  </div>
                  <p className={styles.paymentNote}>
                    🔒 Secured payment powered by Paystack.
                  </p>
                </div>
              ) : (
                <div className={styles.visitSummary}>
                  <h2>In-Clinic Consultation</h2>
                  <p>In-Clinic appointments are scheduling-free today. Standard consultation and facility charges will be paid securely at the physical clinic during your visit.</p>
                </div>
              )}
            </aside>
          </motion.div>
        )}

        {state.step === 5 && (
          <motion.div animate={{ opacity: 1, y: 0 }} className={`${styles.stepPanel} ${styles.successPanel}`} initial={{ opacity: 0, y: 15 }} transition={{ duration: 0.45, ease }}>
            <CheckCircle2 aria-hidden className={styles.successIcon} size={112} />
            <p className={styles.successText}>
              Your {state.modality === "telemedicine" ? "telemedicine" : "in-clinic"} appointment is scheduled for <strong>{formatDate(state.date)} at {state.timeSlot}</strong>.
            </p>
            <div className={`${styles.confirmationGrid} ${styles.confirmationGridSpacing}`}>
              <span>
                <strong>Service</strong>
                {state.service}
              </span>
              <span>
                <strong>Date</strong>
                {formatDate(state.date)}
              </span>
              <span>
                <strong>Time</strong>
                {state.timeSlot}
              </span>
            </div>

            {state.modality === "telemedicine" ? (
              <div className={`${styles.videoRoom} ${styles.videoRoomContext}`}>
                <Video aria-hidden size={34} />
                <h2>Join Secure Video Room</h2>
                <p>
                  Your secure room is prepared. Check your email confirmation for link and access instructions. Room will open 5 minutes before scheduled session.
                </p>
                <a href={confirmedMeetLink || "#"} className={`${styles.videoRoomJoinBtn} ${confirmedMeetLink ? "" : styles.disabled}`} target="_blank" rel="noopener noreferrer">
                  Access Waiting Room
                </a>
              </div>
            ) : null}

            <p className={`${styles.emergencyDisclaimer} ${styles.emergencyDisclaimerSpacing}`}>
              If this is a medical emergency, please call <strong>0907 448 7448</strong> immediately.
            </p>
            <Link className={`${styles.homeLink} ${styles.homeLinkSpacing}`} href="/">
              <Home aria-hidden size={18} />
              Return to Homepage
            </Link>
          </motion.div>
        )}

        {state.step < 5 && (
          <div className={styles.actionBar}>
            <div>
              <strong>{state.service ?? "Select a specialty"}</strong>
              <span>
                {state.modality === "telemedicine" ? "Virtual Consultation" : null}
                {state.modality === "in-clinic" ? "In-Clinic Visit" : null}
                {state.isFollowUp && isFollowUpEligible ? " / Follow-Up" : null}
                {state.date && state.timeSlot ? ` / ${formatDate(state.date)} at ${state.timeSlot}` : null}
              </span>
            </div>
            <button
              disabled={!canContinue || isSubmitting}
              onClick={() => {
                if (state.step === 4) {
                  if (state.modality === "telemedicine" && !consentAgreed) {
                    setIsConsentModalOpen(true);
                  } else {
                    handleProceedToSecurePayment();
                  }
                } else {
                  setState(c => ({ ...c, step: (c.step + 1) as Step }));
                }
              }}
              type="button"
            >
              {isSubmitting ? (
                <div className={styles.processingSpinner}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  {state.step === 4 ? (
                    state.modality === "telemedicine" ? "Proceed to Secure Payment" : "Confirm Appointment"
                  ) : "Next Step"}
                  <ArrowRight aria-hidden size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* Telemedicine Consent Check Modal */}
      {isConsentModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="consent-modal-title">
          <div ref={modalRef} className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 id="consent-modal-title">Telemedicine Clinical Consent</h3>
                <span>Please read and agree to proceed</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsConsentModalOpen(false);
                  setConsentAgreed(false);
                }}
                className={styles.modalCloseBtn}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.clinicalDisclaimerWarning}>
                <h4>EMERGENCY WARNING</h4>
                <p>
                  In the event of an Emergency, do not use this Telemedicine. Maryland Healthcare will not be held liable for any client's misjudgment of the use of this Telemedicine.
                </p>
              </div>

              <section>
                <h4>What Is Telemedicine?</h4>
                <p>
                  Telemedicine is the use of electronic internet connectivity and telecommunication technology to deliver clinical healthcare services. This facilitates a real-time/live connection between clients and healthcare Providers for the exchange of medical information without requiring participants to be in the same physical location.
                </p>
              </section>

              <section>
                <h4>How Telemedicine Works</h4>
                <p>
                  Telemedicine operates by connecting clients and Healthcare Providers through secure digital platforms. Clients can use smartphones, tablets, or computers to schedule appointments, share health data, and communicate with doctors. Behind the scenes, Telemedicine relies on the following to enable smooth and efficient virtual healthcare delivery:
                </p>
                <ul>
                  <li>Reliable internet connectivity for the Client and separate for the Provider.</li>
                  <li>For Maryland Healthcare:</li>
                  <ul className={styles.modalNestedList}>
                    <li>Website as a platform for accessing the Appointment scheduler</li>
                    <li>An effective appointment scheduling app. on the website</li>
                    <li>Video conferencing tools, e.g., Zoom or Google Meet</li>
                    <li>Electronic Health Records for documentation.</li>
                  </ul>
                </ul>
              </section>

              <section>
                <h4>Goals of Telemedicine</h4>
                <ul>
                  <li>Improving access to healthcare for people in remote or rural communities</li>
                  <li>Keeping patients and others safe during infectious disease concerns</li>
                  <li>Offering primary care services for various conditions</li>
                  <li>Providing access to medical specialists</li>
                  <li>Improving communication and coordination among healthcare teams.</li>
                </ul>
              </section>

              <section>
                <h4>Who Should Use Telemedicine Services</h4>
                <p className={styles.modalNote}>
                  Note that Telemedicine cannot be used to treat emergencies. Please go to the Hospital nearest to you.
                </p>
                <ul>
                  <li><strong>Rural and Remote Communities:</strong> People who travel from the city to rural or remote locations where services are poor, or where transport costs and risks of loss of life are high.</li>
                  <li><strong>Homebound/Bedbound Individuals:</strong> or people with mobility challenges</li>
                  <li><strong>Busy Professionals:</strong> and families with demanding work schedules who cannot easily leave work or arrange care for their children.</li>
                  <li><strong>International Travelers:</strong> who have a short waiting time and need information on certain challenges.</li>
                </ul>
              </section>

              <section>
                <h4>Medical Conditions and Services Suitable for Telemedicine</h4>
                <ul>
                  <li>Chronic Disease Management, like Diabetes Mellitus, Hypertension, and Asthma</li>
                  <li>Treatment adjustment</li>
                  <li>Health monitoring</li>
                  <li>Mental Health Services, e.g., Mental Health Counseling, Behavioural Therapy, Psychologists' care</li>
                  <li>Routine and follow-up Care, e.g., Wellness visits, Blood pressure monitor, non-emergency follow-up, Prescription Management, Nutrition counseling, Physical Therapy Exercises, Dermatology, some Cardiology Diseases</li>
                </ul>
              </section>

              <section>
                <h4>Key Requirements for Telemedicine Success</h4>
                <ul>
                  <li>Strong Internet connectivity for effective communication</li>
                  <li>Patient's willingness and ability to engage through video communications</li>
                  <li>Patient's possession of a reliable smartphone, notebooks, laptops, or desktops.</li>
                  <li>Knowledge of the use of smart devices.</li>
                  <li>Ability to follow instructions and good cognitive status to understand medical advice.</li>
                  <li>Signing the Consent Form before accessing the service.</li>
                </ul>
              </section>

              <div className={styles.modalSignature}>
                <p><strong>Steve Ekwelibe</strong></p>
                <p>2nd. Jan. 2026</p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalDeclineBtn}
                onClick={() => {
                  setConsentAgreed(false);
                  setIsConsentModalOpen(false);
                }}
              >
                Decline
              </button>
              <button
                type="button"
                className={styles.modalAcceptBtn}
                onClick={() => {
                  setConsentAgreed(true);
                  setIsConsentModalOpen(false);
                  handleProceedToSecurePayment();
                }}
              >
                Accept & Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
