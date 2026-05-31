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
  UserCheck,
  Mail,
  Phone,
  FileText,
  Receipt,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { usePaystackPayment } from "react-paystack";
import {
  getDaySlots,
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
type Step1Sub = "modality" | "specialty";
type Modality = "in-clinic" | "telemedicine";
type PatientType = "new" | "returning";

interface BookingState {
  step: Step;
  step1Sub: Step1Sub;
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

// Directional slide variants for sub-step transitions within Step 1
const slideVariants = {
  enterFromRight: { opacity: 0, x: 48 },
  enterFromLeft:  { opacity: 0, x: -48 },
  center:         { opacity: 1, x: 0 },
  exitToLeft:     { opacity: 0, x: -48 },
  exitToRight:    { opacity: 0, x: 48 },
};

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
  const [allSlots, setAllSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [bookingVersion, setBookingVersion] = useState(0);
  // Retained for future portal deep-linking and direct video-call join from confirmation page
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
    step1Sub: "modality",
    modality: null,
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

  // Track direction for Step 1 sub-step slide animation
  const [step1Direction, setStep1Direction] = useState<"forward" | "back">("forward");

  // Calculate pricing dynamic and WAT-safe
  const price = useMemo(() => {
    if (state.modality === "in-clinic") return 0;
    const base = state.service === "Mental Health" ? PRICING_CONSTANTS.mentalHealth : PRICING_CONSTANTS.generalPractice;
    if (state.isFollowUp && isFollowUpEligible) {
      return base / 2;
    }
    return base;
  }, [state.modality, state.service, state.isFollowUp, isFollowUpEligible]);

  const hasAvailableSlots = useMemo(() => {
    if (!state.date || allSlots.length === 0) return false;
    const now = new Date();
    const isToday = state.date.toDateString() === now.toDateString();

    return allSlots.some(slot => {
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
      return !isPast && !isBooked;
    });
  }, [state.date, bookedSlots, allSlots]);

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

  // Fetch available slots dynamically from doctor configurations
  useEffect(() => {
    if (state.date) {
      setIsLoadingSlots(true);
      const dateStr = format(state.date, "yyyy-MM-dd");
      getDaySlots(dateStr, state.service)
        .then(({ allSlots: fetchedSlots, bookedSlots: fetchedBooked }) => {
          setAllSlots(fetchedSlots);
          setBookedSlots(fetchedBooked);
          // Clear time slot if it no longer exists in the fetched schedule
          setState(c => {
            if (c.timeSlot && !fetchedSlots.includes(c.timeSlot)) {
              return { ...c, timeSlot: null };
            }
            return c;
          });
        })
        .catch((err) => {
          console.error("Failed to load slots:", err);
          setAllSlots([]);
          setBookedSlots([]);
        })
        .finally(() => {
          setIsLoadingSlots(false);
        });
    } else {
      setAllSlots([]);
      setBookedSlots([]);
    }
  }, [state.date, state.service, bookingVersion]);

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
      // On modality sub-step: no Next button shown; auto-advance on click.
      // On specialty sub-step: need a service selected.
      if (state.step1Sub === "modality") return false;
      return Boolean(state.service);
    }
    if (state.step === 2) {
      if (state.modality === "in-clinic") {
        return Boolean(state.date);
      }
      return Boolean(state.date && state.timeSlot);
    }
    if (state.step === 3) {
      if (state.modality === "in-clinic") {
        return Boolean(
          state.patientDetails.firstName &&
          state.patientDetails.lastName &&
          state.patientDetails.email &&
          state.patientDetails.phone
        );
      }
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

  // Progress bar percentage — step1A = 10%, step1B = 20%, steps 2-5 = 40/60/80/100%
  const progressPct = useMemo(() => {
    if (state.step === 1) {
      return state.step1Sub === "modality" ? 10 : 20;
    }
    return (state.step / 5) * 100;
  }, [state.step, state.step1Sub]);

  // Helper: handle modality card click — auto-advance to specialty sub-step
  function selectModalityAndAdvance(modality: Modality) {
    setStep1Direction("forward");
    setState(curr => ({
      ...curr,
      modality,
      step1Sub: "specialty",
      isFollowUp: modality === "in-clinic" ? false : curr.isFollowUp,
      service: modality === "telemedicine"
        ? ((curr.service === "General Practice" || curr.service === "Mental Health") ? curr.service : null)
        : curr.service,
    }));
  }

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

    if (!canContinue || !state.date || (state.modality !== "in-clinic" && !state.timeSlot)) return;

    setIsSubmitting(true);
    try {
      // 1. If new patient, register their account first (only for virtual telemedicine consultations)
      if (state.modality !== "in-clinic" && state.patientType === "new" && !loginSuccess) {
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

      // Save scheduled timestamp aligned to Lagos day hour offsets
      const scheduledDate = new Date(state.date);
      if (state.modality === "in-clinic") {
        // Default walk-in hours to 08:00 AM WAT in Lagos
        scheduledDate.setHours(8, 0, 0, 0);
      } else {
        // Resolve booking time in WAT-safe ISO
        const [time, ampm] = state.timeSlot!.split(" ");
        let [hours, minutes] = time.split(":").map(Number);
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        scheduledDate.setHours(hours, minutes, 0, 0);
      }

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
        isNewPatient: state.modality !== "in-clinic" && state.patientType === "new" && !loginSuccess,
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

  // Back button handler — aware of sub-steps
  function handleBack() {
    if (state.step === 1 && state.step1Sub === "specialty") {
      setStep1Direction("back");
      setState(c => ({ ...c, step1Sub: "modality" }));
    } else if (state.step > 1 && state.step < 5) {
      setState(c => ({ ...c, step: (c.step - 1) as Step }));
    }
  }

  const isAtStart = state.step === 1 && state.step1Sub === "modality";

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <button disabled={isAtStart || state.step === 5} onClick={handleBack} type="button">
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
        {state.step !== 5 && (
          <div className={styles.stepIntro}>
            <p>
              {state.step === 1 && state.step1Sub === "modality" ? "Step 1 of 5 — Choose Mode" : null}
              {state.step === 1 && state.step1Sub === "specialty" ? "Step 1 of 5 — Choose Specialty" : null}
              {state.step === 2 ? "Step 2 of 5" : null}
              {state.step === 3 ? "Step 3 of 5" : null}
              {state.step === 4 ? "Step 4 of 5" : null}
            </p>
            <h1 id="booking-heading">
              {state.step === 1 && state.step1Sub === "modality" ? "How would you like to consult?" : null}
              {state.step === 1 && state.step1Sub === "specialty" ? "Select a Specialty" : null}
              {state.step === 2 ? "When would you like to visit?" : null}
              {state.step === 3 ? "Your Details" : null}
              {state.step === 4 ? "Review & Confirm" : null}
            </h1>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Booking progress: ${Math.round(progressPct)}%`}
            >
              <span style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
        {state.step === 1 && (
          <AnimatePresence mode="wait" initial={false}>
            {/* SUB-STEP 1A — Modality Selection */}
            {state.step1Sub === "modality" && (
              <motion.div
                key="step1-modality"
                className={styles.stepPanel}
                variants={slideVariants}
                initial={step1Direction === "forward" ? "enterFromRight" : "enterFromLeft"}
                animate="center"
                exit={step1Direction === "forward" ? "exitToLeft" : "exitToRight"}
                transition={{ duration: 0.38, ease }}
              >
                <p className={styles.step1Hint}>Select how you&apos;d like to receive care — you&apos;ll choose a specialty next.</p>
                <div className={styles.modalityGrid}>
                  <button
                    className={`${styles.modalityCard} ${state.modality === "in-clinic" ? styles.selectedCard : ""}`}
                    onClick={() => selectModalityAndAdvance("in-clinic")}
                    type="button"
                    aria-pressed={state.modality === "in-clinic"}
                    id="modality-in-clinic"
                  >
                    <span className={styles.iconCircle}>
                      <Building2 aria-hidden size={30} />
                    </span>
                    <strong>In-Clinic Visit</strong>
                    <span>Schedule a face-to-face consultation at our Port Harcourt facility.</span>
                    <span className={styles.modalityMeta}>All specialties · Free at clinic</span>
                  </button>
                  <button
                    className={`${styles.modalityCard} ${styles.virtualCard} ${state.modality === "telemedicine" ? styles.selectedVirtual : ""}`}
                    onClick={() => selectModalityAndAdvance("telemedicine")}
                    type="button"
                    aria-pressed={state.modality === "telemedicine"}
                    id="modality-telemedicine"
                  >
                    <span className={styles.iconCircle}>
                      <Video aria-hidden size={30} />
                    </span>
                    <strong>Virtual Consultation</strong>
                    <span>Connect securely with our trusted doctors from home.</span>
                    <span className={styles.modalityMeta}>General Practice &amp; Mental Health · Pay online</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* SUB-STEP 1B — Specialty Selection */}
            {state.step1Sub === "specialty" && (
              <motion.div
                key="step1-specialty"
                className={styles.stepPanel}
                variants={slideVariants}
                initial={step1Direction === "forward" ? "enterFromRight" : "enterFromLeft"}
                animate="center"
                exit={step1Direction === "forward" ? "exitToLeft" : "exitToRight"}
                transition={{ duration: 0.38, ease }}
              >
                {/* Modality context chip */}
                <div className={styles.modalityChip}>
                  {state.modality === "in-clinic"
                    ? <><Building2 size={15} aria-hidden /><span>In-Clinic Visit</span></>
                    : <><Video size={15} aria-hidden /><span>Virtual Consultation</span></>}
                  <button
                    type="button"
                    className={styles.modalityChipChange}
                    onClick={() => {
                      setStep1Direction("back");
                      setState(c => ({ ...c, step1Sub: "modality" }));
                    }}
                  >
                    Change
                  </button>
                </div>

                <div className={styles.serviceGrid}>
                  {availableSpecialties.map(({ Icon, description, name, price }, idx) => (
                    <motion.button
                      key={name}
                      className={`${styles.serviceCard} ${state.service === name ? styles.selectedService : ""}`}
                      onClick={() => setState((curr) => ({ ...curr, service: name }))}
                      type="button"
                      aria-pressed={state.service === name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.06, ease }}
                    >
                      <span className={styles.serviceCardIconWrap}>
                        <Icon aria-hidden size={22} />
                      </span>
                      <span>
                        <strong>{name}</strong>
                        {price !== null && (
                          <em className={styles.priceDisplay}>
                            NGN {price.toLocaleString()}
                          </em>
                        )}
                        <em>{description}</em>
                      </span>
                      {state.service === name && (
                        <span className={styles.serviceSelectedCheck} aria-hidden>
                          <CheckCircle2 size={18} />
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Follow-up toggle — only for telemedicine */}
                {state.modality === "telemedicine" && (
                  <div className={styles.consentCard} style={{ marginTop: "1.75rem" }}>
                    <label className={styles.consentCheckboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.consentCheckboxInput}
                        checked={state.isFollowUp}
                        onChange={(e) => setState(curr => ({ ...curr, isFollowUp: e.target.checked }))}
                        id="follow-up-toggle"
                      />
                      <span className={styles.consentText}>
                        This is a <strong>Follow-Up Consultation</strong> — Completed consult within 30 days? You save 50%!
                      </span>
                    </label>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
                  const disabled = state.modality === "in-clinic" ? isPast : (isPast || weekend);
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
              {state.modality === "in-clinic" ? (
                !state.date ? (
                  <div className={styles.noSlotsNotice}>
                    <Clock size={24} />
                    <p>Please select a date from the calendar for your clinic visit.</p>
                  </div>
                ) : (
                  <div className={styles.inClinicDateConfirmed}>
                    <ShieldCheck size={28} className={styles.inClinicCheckIcon} />
                    <h3>Clinic Visit Scheduled</h3>
                    <p>
                      You have selected <strong>{format(state.date, "EEEE, MMMM d, yyyy")}</strong>.
                    </p>
                    <div className={styles.inClinicInfoBox}>
                      <strong>24/7 Walk-in Policy</strong>
                      <p>Our Port Harcourt facility is open 24 hours a day, 7 days a week. You can walk in at any time on your scheduled day. Receptionists will complete your check-in and process payment upon arrival.</p>
                    </div>
                  </div>
                )
              ) : !state.date ? (
                <div className={styles.noSlotsNotice}>
                  <Clock size={24} />
                  <p>Please select a date from the calendar to view available consultation slots.</p>
                </div>
              ) : isLoadingSlots ? (
                <div className={styles.noSlotsNotice}>
                  <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
                  <p>Loading available time slots...</p>
                </div>
              ) : !hasAvailableSlots ? (
                <div className={styles.noSlotsNotice}>
                  <ShieldCheck size={24} style={{ color: 'var(--accent)' }} />
                  <h3>No Slots Available</h3>
                  <p>
                    There are no available slots for <strong>{state.service}</strong> on {format(state.date, "EEEE, MMMM d, yyyy")}. This may be because all appointments are booked or no attending doctors are scheduled.
                  </p>
                  <p className={styles.noSlotsMuted}>Please select another date on the calendar.</p>
                </div>
              ) : (
                <>
                  {allSlots.filter(s => s.endsWith('AM')).length > 0 && renderTimeSlots("Morning Sessions", allSlots.filter(s => s.endsWith('AM')))}
                  {allSlots.filter(s => s.endsWith('PM')).length > 0 && renderTimeSlots("Afternoon Sessions", allSlots.filter(s => s.endsWith('PM')))}
                </>
              )}
            </section>
          </motion.div>
        )}

        {state.step === 3 && (
          <motion.div animate={{ opacity: 1, y: 0 }} className={`${styles.stepPanel} ${styles.detailsGrid}`} initial={{ opacity: 0, y: 15 }} transition={{ duration: 0.45, ease }}>
            <section className={styles.detailsForm}>
              {state.modality === "in-clinic" ? (
                <>
                  <div className={styles.inClinicFormIntro}>
                    <h3>Clinic Visit Intake Details</h3>
                    <p>Please enter your contact information to schedule your facility visit. No account registration is required.</p>
                  </div>

                  <div className={styles.formGrid}>
                    <label>
                      <span className={styles.inputLabelWithIcon}><UserRound size={14} /> First Name</span>
                      <div className={styles.inputWrapper}>
                        <UserRound className={styles.inputIcon} size={18} />
                        <input
                          type="text"
                          required
                          placeholder="John"
                          value={state.patientDetails.firstName}
                          onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, firstName: e.target.value } }))}
                        />
                      </div>
                    </label>
                    <label>
                      <span className={styles.inputLabelWithIcon}><UserRound size={14} /> Last Name</span>
                      <div className={styles.inputWrapper}>
                        <UserRound className={styles.inputIcon} size={18} />
                        <input
                          type="text"
                          required
                          placeholder="Doe"
                          value={state.patientDetails.lastName}
                          onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, lastName: e.target.value } }))}
                        />
                      </div>
                    </label>
                    <label>
                      <span className={styles.inputLabelWithIcon}><Phone size={14} /> Phone Number</span>
                      <div className={styles.inputWrapper}>
                        <Phone className={styles.inputIcon} size={18} />
                        <input
                          type="tel"
                          required
                          placeholder="0907 448 7448"
                          value={state.patientDetails.phone}
                          onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, phone: e.target.value } }))}
                        />
                      </div>
                    </label>
                    <label>
                      <span className={styles.inputLabelWithIcon}><Mail size={14} /> Email Address</span>
                      <div className={styles.inputWrapper}>
                        <Mail className={styles.inputIcon} size={18} />
                        <input
                          type="email"
                          required
                          placeholder="john.doe@example.com"
                          value={state.patientDetails.email}
                          onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, email: e.target.value } }))}
                        />
                      </div>
                    </label>
                    <label className={styles.fullWidth}>
                      <span className={styles.inputLabelWithIcon}><FileText size={14} /> Reason for Visit (Optional)</span>
                      <div className={styles.textareaWrapper}>
                        <FileText className={styles.textareaIcon} size={18} />
                        <textarea
                          rows={3}
                          placeholder="Please describe symptoms, medical history, or the purpose of your clinic visit..."
                          value={state.patientDetails.reason}
                          onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, reason: e.target.value } }))}
                        />
                      </div>
                    </label>
                  </div>
                </>
              ) : loginSuccess ? (
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
                      <span className={styles.inputLabelWithIcon}><FileText size={14} /> Reason for Visit (Optional)</span>
                      <div className={styles.textareaWrapper}>
                        <FileText className={styles.textareaIcon} size={18} />
                        <textarea
                          rows={3}
                          value={state.patientDetails.reason}
                          placeholder="Please describe symptoms, medical history, or the purpose of your visit..."
                          onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, reason: e.target.value } }))}
                        />
                      </div>
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
                          <span className={styles.inputLabelWithIcon}><Mail size={14} /> Registered Email Address</span>
                          <div className={styles.inputWrapper}>
                            <Mail className={styles.inputIcon} size={18} />
                            <input
                              type="email"
                              required
                              placeholder="yourname@example.com"
                              value={state.patientDetails.email}
                              onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, email: e.target.value } }))}
                              onBlur={handleEmailBlur}
                            />
                          </div>
                        </label>
                        <label className={styles.fullWidth}>
                          <span className={styles.inputLabelWithIcon}><Lock size={14} /> Secure Password</span>
                          <div className={styles.passwordWrapper}>
                            <Lock className={styles.inputIcon} size={18} />
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              placeholder="••••••••"
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
                            <>
                              <UserCheck size={18} />
                              <span>Login & Auto-fill Details</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <label>
                          <span className={styles.inputLabelWithIcon}><UserRound size={14} /> First Name</span>
                          <div className={styles.inputWrapper}>
                            <UserRound className={styles.inputIcon} size={18} />
                            <input
                              type="text"
                              required
                              placeholder="John"
                              value={state.patientDetails.firstName}
                              onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, firstName: e.target.value } }))}
                            />
                          </div>
                        </label>
                        <label>
                          <span className={styles.inputLabelWithIcon}><UserRound size={14} /> Last Name</span>
                          <div className={styles.inputWrapper}>
                            <UserRound className={styles.inputIcon} size={18} />
                            <input
                              type="text"
                              required
                              placeholder="Doe"
                              value={state.patientDetails.lastName}
                              onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, lastName: e.target.value } }))}
                            />
                          </div>
                        </label>
                        <label>
                          <span className={styles.inputLabelWithIcon}><Phone size={14} /> Phone Number</span>
                          <div className={styles.inputWrapper}>
                            <Phone className={styles.inputIcon} size={18} />
                            <input
                              type="tel"
                              required
                              placeholder="0907 448 7448"
                              value={state.patientDetails.phone}
                              onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, phone: e.target.value } }))}
                            />
                          </div>
                        </label>
                        <label>
                          <span className={styles.inputLabelWithIcon}><Mail size={14} /> Email Address</span>
                          <div className={styles.inputWrapper}>
                            <Mail className={styles.inputIcon} size={18} />
                            <input
                              type="email"
                              required
                              placeholder="john.doe@example.com"
                              value={state.patientDetails.email}
                              onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, email: e.target.value } }))}
                              onBlur={handleEmailBlur}
                            />
                          </div>
                        </label>
                        <label className={styles.fullWidth}>
                          <div className={styles.passwordHeader}>
                            <span className={styles.inputLabelWithIcon}><Lock size={14} /> Create Password</span>
                            {patientPassword && (
                              <span className={`${styles.strengthLabel} ${passwordStrength === 3 ? styles.strengthStrong : passwordStrength === 2 ? styles.strengthMedium : styles.strengthWeak}`}>
                                {passwordStrength === 3 ? "Very Secure" : passwordStrength === 2 ? "Medium" : "Too Weak"}
                              </span>
                            )}
                          </div>
                          <div className={styles.passwordWrapper}>
                            <Lock className={styles.inputIcon} size={18} />
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              placeholder="Minimum 8 characters with letters & numbers"
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
                          <span className={styles.inputLabelWithIcon}><FileText size={14} /> Reason for Visit (Optional)</span>
                          <div className={styles.textareaWrapper}>
                            <FileText className={styles.textareaIcon} size={18} />
                            <textarea
                              rows={3}
                              placeholder="Please describe symptoms, medical history, or the purpose of your visit..."
                              value={state.patientDetails.reason}
                              onChange={(e) => setState(c => ({ ...c, patientDetails: { ...c.patientDetails, reason: e.target.value } }))}
                            />
                          </div>
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
                  <div className={styles.paymentRow}>
                    <span>Consultation Fee</span>
                    <strong>NGN {price.toLocaleString()}</strong>
                  </div>
                  <div className={styles.paymentRow}>
                    <span>Facility Charge</span>
                    <strong>Included</strong>
                  </div>
                  <hr />
                  <div className={`${styles.paymentRow} ${styles.totalRow}`}>
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
                    <span className={styles.followUpEligible}>
                      <strong>✅ Follow-Up Eligible</strong>
                      <span>Previous visit detected within 30 days! 50% discount has been successfully applied to this booking.</span>
                    </span>
                  ) : (
                    <span className={styles.followUpNotEligible}>
                      <strong>❌ Not Eligible for Discount</strong>
                      <span>No completed visit found within the last 30 days. Standard consultation fee will apply at check-out.</span>
                    </span>
                  )}
                </div>
              )}
            </aside>
          </motion.div>
        )}

        {state.step === 4 && (
          <motion.div animate={{ opacity: 1, y: 0 }} className={`${styles.stepPanel} ${styles.detailsGrid}`} initial={{ opacity: 0, y: 15 }} transition={{ duration: 0.45, ease }}>
            <section className={styles.detailsForm}>
              <h2 className={styles.reviewHeading}>Review Your Appointment Information</h2>
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
              <div className={styles.reviewBrief}>
                {/* Section 1: Clinical Consultation */}
                <div className={styles.reviewSection}>
                  <div className={styles.reviewSectionHeader}>
                    <Stethoscope size={18} className={styles.reviewSectionIcon} />
                    <h3>Clinical Consultation</h3>
                  </div>
                  
                  <div className={styles.reviewGrid}>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Specialty / Service</span>
                      <span className={styles.reviewVal}>{state.service}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Consultation Modality</span>
                      <span className={styles.reviewVal}>
                        {state.modality === "telemedicine" ? "Virtual Consultation" : "In-Clinic Visit"}
                        {state.isFollowUp && isFollowUpEligible ? " (Follow-Up)" : ""}
                      </span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Scheduled Date</span>
                      <span className={styles.reviewVal}>{formatDate(state.date)}</span>
                    </div>
                    {state.modality !== "in-clinic" && (
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Selected Time Slot</span>
                        <span className={styles.reviewVal}>{state.timeSlot}</span>
                      </div>
                    )}
                  </div>
                </div>

                <hr className={styles.reviewDivider} />

                {/* Section 2: Patient Dossier */}
                <div className={styles.reviewSection}>
                  <div className={styles.reviewSectionHeader}>
                    <UserRound size={18} className={styles.reviewSectionIcon} />
                    <h3>Patient Dossier</h3>
                  </div>

                  <div className={styles.reviewGrid}>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Full Name</span>
                      <span className={styles.reviewValDark}>{state.patientDetails.firstName} {state.patientDetails.lastName}</span>
                    </div>
                    <div className={styles.reviewItem}>
                      <span className={styles.reviewLabel}>Contact Phone</span>
                      <span className={styles.reviewValDark}>{state.patientDetails.phone}</span>
                    </div>
                    <div className={`${styles.reviewItem} ${styles.fullWidth}`}>
                      <span className={styles.reviewLabel}>Email Address</span>
                      <span className={styles.reviewValDark}>{state.patientDetails.email}</span>
                    </div>
                    {state.patientDetails.reason && (
                      <div className={`${styles.reviewItem} ${styles.fullWidth}`}>
                        <span className={styles.reviewLabel}>Reason for Visit</span>
                        <blockquote className={styles.reviewReasonQuote}>
                          "{state.patientDetails.reason}"
                        </blockquote>
                      </div>
                    )}
                  </div>
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
                <div className={styles.paymentCard}>
                  <Building2 aria-hidden size={30} style={{ color: 'var(--primary)' }} />
                  <h2>Facility Intake</h2>
                  <div className={styles.paymentRow}>
                    <span>Consultation Fee</span>
                    <strong>Pay at Clinic</strong>
                  </div>
                  <div className={styles.paymentRow}>
                    <span>Facility Charge</span>
                    <strong>Pay at Clinic</strong>
                  </div>
                  <hr />
                  <div className={`${styles.paymentRow} ${styles.totalRow}`}>
                    <span>Total Due Today</span>
                    <strong>NGN 0</strong>
                  </div>
                  <p className={styles.paymentNote} style={{ color: 'var(--text-muted)' }}>
                    Payment will be processed at the front desk check-in.
                  </p>
                </div>
              )}
            </aside>
          </motion.div>
        )}

        {state.step === 5 && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={styles.confirmationPage}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease }}
          >
            <div className={styles.confirmationCard}>
              {/* ── Header: Icon + Title ──────────────────── */}
              <div className={styles.confirmationCardHeader}>
                <div className={styles.confirmationCheckmark}>
                  <CheckCircle2 aria-hidden size={44} />
                </div>
                <h1 className={styles.confirmationHeading}>Consultation Confirmed</h1>
                <p className={styles.confirmationSubtext}>
                  Your {state.modality === "telemedicine" ? "virtual clinic" : "in-clinic"} appointment is confirmed. A summary has been sent to <strong>{state.patientDetails.email}</strong>.
                </p>
              </div>

              {/* ── Divider ──────────────────────────────── */}
              <div className={styles.confirmationDivider} />

              {/* ── Appointment Details Grid ──────────────── */}
              <div className={styles.confirmationDetailsGrid}>
                <div className={styles.confirmationDetailItem}>
                  <span className={styles.confirmationDetailLabel}>Specialty</span>
                  <strong className={styles.confirmationDetailValue}>{state.service}</strong>
                </div>
                <div className={styles.confirmationDetailSep} />
                <div className={styles.confirmationDetailItem}>
                  <span className={styles.confirmationDetailLabel}>Date</span>
                  <strong className={styles.confirmationDetailValue}>{formatDate(state.date)}</strong>
                </div>
                <div className={styles.confirmationDetailSep} />
                <div className={styles.confirmationDetailItem}>
                  <span className={styles.confirmationDetailLabel}>Time</span>
                  <strong className={styles.confirmationDetailValue}>
                    {state.modality === "in-clinic" ? "24/7 Walk-in" : state.timeSlot}
                  </strong>
                </div>
              </div>

              {/* ── Advisory Inset ────────────────────────── */}
              {state.modality === "telemedicine" ? (
                <div className={styles.confirmationAdvisory}>
                  <Video size={18} aria-hidden />
                  <div>
                    <strong>Virtual Clinic Advisory</strong>
                    <p>Your secure video link opens on <strong>{formatDate(state.date)}</strong> at <strong>{state.timeSlot}</strong>. Join via the link in your confirmation email or through the Patient Portal.</p>
                  </div>
                </div>
              ) : (
                <div className={styles.confirmationAdvisory}>
                  <Building2 size={18} aria-hidden />
                  <div>
                    <strong>Clinic Check-in</strong>
                    <p>Please arrive at our facility 15 minutes before your scheduled day for vitals check-in and reception desk processing.</p>
                  </div>
                </div>
              )}

              {/* ── Emergency Warning Strip ───────────────── */}
              <div className={styles.confirmationWarningStrip}>
                <AlertTriangle size={16} aria-hidden />
                <span>For life-threatening emergencies, call <strong>0907 448 7448</strong> immediately.</span>
              </div>

              {/* ── Action Buttons ────────────────────────── */}
              <div className={styles.confirmationActions}>
                {state.modality === "telemedicine" ? (
                  <>
                    <Link className={styles.confirmationBtnPrimary} href="/dashboard/my-appointments">
                      <UserCheck aria-hidden size={18} />
                      Access Patient Portal
                    </Link>
                    <Link className={styles.confirmationBtnOutline} href="/">
                      <Home aria-hidden size={18} />
                      Return to Homepage
                    </Link>
                  </>
                ) : (
                  <Link className={styles.confirmationBtnPrimary} href="/">
                    <Home aria-hidden size={18} />
                    Return to Homepage
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Action bar — hidden during Step 1A (modality), shown from Step 1B onwards */}
        {state.step < 5 && !(state.step === 1 && state.step1Sub === "modality") && (
          <div className={styles.actionBar}>
            <div>
              <strong>{state.service ?? "Select a specialty"}</strong>
              <span>
                {state.modality === "telemedicine" ? "Virtual Consultation" : null}
                {state.modality === "in-clinic" ? "In-Clinic Visit" : null}
                {state.isFollowUp && isFollowUpEligible ? " · Follow-Up" : null}
                {state.date && state.timeSlot ? ` · ${formatDate(state.date)} at ${state.timeSlot}` : null}
              </span>
            </div>
            <button
              disabled={!canContinue || isSubmitting}
              onClick={() => {
                if (state.step === 1 && state.step1Sub === "specialty") {
                  setState(c => ({ ...c, step: 2, step1Sub: "modality" }));
                } else if (state.step === 4) {
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
