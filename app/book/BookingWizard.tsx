"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Building2,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  Home,
  Lock,
  Microscope,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./book.module.css";

type Step = 1 | 2 | 3 | 4;
type Modality = "in-clinic" | "telemedicine";
type PatientType = "new" | "returning";

interface BookingState {
  step: Step;
  modality: Modality | null;
  service: string | null;
  date: Date | null;
  timeSlot: string | null;
  patientType: PatientType;
  patientDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    hmoProvider: string;
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
  { label: "08:00 AM", available: false },
  { label: "08:30 AM", available: false },
  { label: "09:00 AM", available: true },
  { label: "09:30 AM", available: true },
  { label: "10:00 AM", available: true },
  { label: "10:30 AM", available: true },
];

const afternoonSlots = [
  { label: "01:00 PM", available: true },
  { label: "01:30 PM", available: true },
  { label: "02:00 PM", available: false },
  { label: "02:30 PM", available: false },
  { label: "03:00 PM", available: true },
  { label: "03:30 PM", available: true },
];

const calendarDays = Array.from({ length: 31 }, (_, index) => index + 1);

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
  const reveal = false;
  const [state, setState] = useState<BookingState>({
    step: 1,
    modality: "in-clinic",
    service: null,
    date: null,
    timeSlot: null,
    patientType: "new",
    patientDetails: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      hmoProvider: "",
      reason: "",
    },
  });

  const canContinue = useMemo(() => {
    if (state.step === 1) {
      return Boolean(state.service);
    }

    if (state.step === 2) {
      return Boolean(state.date && state.timeSlot);
    }

    if (state.step === 3) {
      return Boolean(
        state.patientDetails.firstName &&
          state.patientDetails.lastName &&
          state.patientDetails.email &&
          state.patientDetails.phone &&
          state.patientDetails.reason,
      );
    }

    return true;
  }, [state]);

  function setStep(step: Step) {
    setState((current) => ({ ...current, step }));
  }

  function nextStep() {
    if (!canContinue) {
      return;
    }

    setState((current) => ({ ...current, step: Math.min(current.step + 1, 4) as Step }));
  }

  function previousStep() {
    setState((current) => ({ ...current, step: Math.max(current.step - 1, 1) as Step }));
  }

  function updatePatientDetails(field: keyof BookingState["patientDetails"], value: string) {
    setState((current) => ({
      ...current,
      patientDetails: {
        ...current.patientDetails,
        [field]: value,
      },
    }));
  }

  function renderTimeSlots(title: string, slots: typeof morningSlots) {
    return (
      <div className={styles.timeGroup}>
        <div className={styles.timeHeader}>
          <CalendarDays aria-hidden size={20} />
          <h3>{title}</h3>
        </div>
        <div className={styles.timeGrid}>
          {slots.map((slot) =>
            slot.available ? (
              <button
                className={`${styles.timePill} ${state.timeSlot === slot.label ? styles.selectedTime : ""}`}
                key={slot.label}
                onClick={() => setState((current) => ({ ...current, timeSlot: slot.label }))}
                type="button"
              >
                {slot.label}
              </button>
            ) : (
              <button className={`${styles.timePill} ${styles.bookedTime}`} disabled key={slot.label} type="button">
                {slot.label}
                <Lock aria-hidden size={14} />
              </button>
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <button disabled={state.step === 1} onClick={previousStep} type="button">
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
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={styles.stepIntro}
          initial={reveal}
          key={`intro-${state.step}`}
          transition={{ duration: 0.55, ease }}
        >
          <p>Step {state.step} of 4</p>
          <h1 id="booking-heading">
            {state.step === 1 ? "Request an Appointment" : null}
            {state.step === 2 ? "When would you like to visit?" : null}
            {state.step === 3 ? "Your Details" : null}
            {state.step === 4 ? "Consultation Confirmed." : null}
          </h1>
          <div className={styles.progressTrack}>
            <span style={{ width: `${(state.step / 4) * 100}%` }} />
          </div>
        </motion.div>

        {state.step === 1 ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={styles.stepPanel}
            initial={reveal}
            transition={{ duration: 0.55, ease, delay: 0.05 }}
          >
            <div className={styles.modalityGrid}>
              <button
                className={`${styles.modalityCard} ${state.modality === "in-clinic" ? styles.selectedCard : ""}`}
                onClick={() => setState((current) => ({ ...current, modality: "in-clinic" }))}
                type="button"
              >
                <span className={styles.iconCircle}>
                  <Building2 aria-hidden size={30} />
                </span>
                <strong>In-Clinic Visit</strong>
                <span>Schedule a face-to-face consultation at our Maryland facility.</span>
              </button>
              <button
                className={`${styles.modalityCard} ${styles.virtualCard} ${
                  state.modality === "telemedicine" ? styles.selectedVirtual : ""
                }`}
                onClick={() => setState((current) => ({ ...current, modality: "telemedicine" }))}
                type="button"
              >
                <span className={styles.iconCircle}>
                  <Video aria-hidden size={30} />
                </span>
                <strong>Virtual Consultation</strong>
                <span>Skip the traffic. Connect securely with our trusted doctors from home.</span>
              </button>
            </div>

            <div className={styles.serviceHeader}>
              <h2>Select a Specialty</h2>
            </div>
            <div className={styles.serviceGrid}>
              {services.map(({ Icon, description, name }) => (
                <button
                  className={`${styles.serviceCard} ${state.service === name ? styles.selectedService : ""}`}
                  key={name}
                  onClick={() => setState((current) => ({ ...current, service: name }))}
                  type="button"
                >
                  <Icon aria-hidden size={24} />
                  <span>
                    <strong>{name}</strong>
                    <em>{description}</em>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}

        {state.step === 2 ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`${styles.stepPanel} ${styles.dateTimeGrid}`}
            initial={reveal}
            transition={{ duration: 0.55, ease, delay: 0.05 }}
          >
            <section className={styles.calendar}>
              <div className={styles.calendarHeader}>
                <button aria-label="Previous month" type="button">
                  <ArrowLeft aria-hidden size={18} />
                </button>
                <h2>May 2026</h2>
                <button aria-label="Next month" type="button">
                  <ArrowRight aria-hidden size={18} />
                </button>
              </div>
              <div className={styles.weekdays}>
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
              </div>
              <div className={styles.daysGrid}>
                {calendarDays.map((day) => {
                  const disabled = day < 13 || day === 17 || day === 24;
                  const selected = state.date?.getDate() === day;

                  return (
                    <button
                      className={`${styles.dayButton} ${selected ? styles.selectedDay : ""}`}
                      disabled={disabled}
                      key={day}
                      onClick={() => setState((current) => ({ ...current, date: new Date(2026, 4, day) }))}
                      type="button"
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={styles.timeColumn}>
              {renderTimeSlots("Morning", morningSlots)}
              {renderTimeSlots("Afternoon", afternoonSlots)}
            </section>
          </motion.div>
        ) : null}

        {state.step === 3 ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`${styles.stepPanel} ${styles.detailsGrid}`}
            initial={reveal}
            transition={{ duration: 0.55, ease, delay: 0.05 }}
          >
            <section className={styles.detailsForm}>
              <div className={styles.patientToggle}>
                {(["new", "returning"] as PatientType[]).map((type) => (
                  <button
                    className={state.patientType === type ? styles.activePatientType : ""}
                    key={type}
                    onClick={() => setState((current) => ({ ...current, patientType: type }))}
                    type="button"
                  >
                    {type === "new" ? "New Patient" : "Returning Patient"}
                  </button>
                ))}
              </div>

              <div className={styles.formGrid}>
                <label>
                  <span>First Name</span>
                  <input
                    onChange={(event) => updatePatientDetails("firstName", event.target.value)}
                    required
                    type="text"
                    value={state.patientDetails.firstName}
                  />
                </label>
                <label>
                  <span>Last Name</span>
                  <input
                    onChange={(event) => updatePatientDetails("lastName", event.target.value)}
                    required
                    type="text"
                    value={state.patientDetails.lastName}
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    onChange={(event) => updatePatientDetails("phone", event.target.value)}
                    required
                    type="tel"
                    value={state.patientDetails.phone}
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    onChange={(event) => updatePatientDetails("email", event.target.value)}
                    required
                    type="email"
                    value={state.patientDetails.email}
                  />
                </label>
                <label className={styles.fullWidth}>
                  <span>HMO Provider</span>
                  <input
                    onChange={(event) => updatePatientDetails("hmoProvider", event.target.value)}
                    type="text"
                    value={state.patientDetails.hmoProvider}
                  />
                </label>
                <label className={styles.fullWidth}>
                  <span>Reason for Visit</span>
                  <textarea
                    onChange={(event) => updatePatientDetails("reason", event.target.value)}
                    required
                    rows={3}
                    value={state.patientDetails.reason}
                  />
                </label>
              </div>
            </section>

            <aside className={styles.summaryColumn}>
              {state.modality === "telemedicine" ? (
                <div className={styles.paymentCard}>
                  <ShieldCheck aria-hidden size={30} />
                  <h2>Payment Summary</h2>
                  <div>
                    <span>Consultation Fee</span>
                    <strong>NGN 15,000</strong>
                  </div>
                  <div>
                    <span>Facility Charge</span>
                    <strong>Included</strong>
                  </div>
                  <hr />
                  <div className={styles.totalRow}>
                    <span>Total Due Today</span>
                    <strong>NGN 15,000</strong>
                  </div>
                </div>
              ) : (
                <div className={styles.visitSummary}>
                  <h2>Appointment Summary</h2>
                  <p>Your in-clinic request will be reviewed by our care team for confirmation.</p>
                </div>
              )}
              <p className={styles.emergencyDisclaimer}>
                If this is a medical emergency, please call <strong>0907 448 7448</strong> immediately.
              </p>
            </aside>
          </motion.div>
        ) : null}

        {state.step === 4 ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`${styles.stepPanel} ${styles.successPanel}`}
            initial={reveal}
            transition={{ duration: 0.55, ease, delay: 0.05 }}
          >
            <CheckCircle2 aria-hidden className={styles.successIcon} size={112} />
            <p>
              Your {state.modality === "telemedicine" ? "telemedicine" : "in-clinic"} appointment is
              scheduled for <strong>{formatDate(state.date)} at {state.timeSlot}</strong>.
            </p>
            <div className={styles.confirmationGrid}>
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
              <div className={styles.videoRoom}>
                <Video aria-hidden size={34} />
                <h2>Join Secure Video Room</h2>
                <p>Room will open 5 minutes before your appointment.</p>
                <a href="https://marylandhealthcare.com.ng/secure-video-room">Access Waiting Room</a>
              </div>
            ) : null}
            <p className={styles.emergencyDisclaimer}>
              If this is a medical emergency, please call <strong>0907 448 7448</strong> immediately.
            </p>
            <Link className={styles.homeLink} href="/">
              <Home aria-hidden size={18} />
              Return to Homepage
            </Link>
          </motion.div>
        ) : null}

        {state.step < 4 ? (
          <div className={styles.actionBar}>
            <div>
              <strong>{state.service ?? "Select a service"}</strong>
              <span>
                {state.modality === "telemedicine" ? "Virtual Consultation" : null}
                {state.modality === "in-clinic" ? "In-Clinic Visit" : null}
                {state.date && state.timeSlot ? ` / ${formatDate(state.date)} at ${state.timeSlot}` : null}
              </span>
            </div>
            <button disabled={!canContinue} onClick={state.step === 3 ? () => setStep(4) : nextStep} type="button">
              {state.step === 3 && state.modality === "telemedicine" ? "Proceed to Secure Payment" : null}
              {state.step === 3 && state.modality !== "telemedicine" ? "Confirm Appointment" : null}
              {state.step < 3 ? "Next Step" : null}
              <ArrowRight aria-hidden size={18} />
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
