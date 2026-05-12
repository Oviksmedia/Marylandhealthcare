"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, HeartPulse, MapPin, Phone, Send, Video } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import styles from "./contact.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function ContactClient() {
  const prefersReducedMotion = useReducedMotion();
  const reveal = prefersReducedMotion ? false : { opacity: 0, y: 26 };

  function handleAppointmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className={styles.page}>
      <motion.section
        className={styles.header}
        initial={reveal}
        transition={{ duration: 0.75, ease }}
        viewport={{ amount: 0.35, once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <h1>Let&apos;s Connect</h1>
        <p>
          For over four decades, we&apos;ve been a quiet constant in the community. Whether
          you have a question, need to schedule a visit, or simply wish to speak with our care
          team, we are here for you.
        </p>
      </motion.section>

      <section className={styles.content} aria-label="Contact Maryland Healthcare">
        <motion.div
          className={styles.leftColumn}
          initial={reveal}
          transition={{ duration: 0.75, ease, delay: 0.08 }}
          viewport={{ amount: 0.25, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className={styles.telemedicineBox}>
            <Video aria-hidden className={styles.backgroundIcon} size={116} />
            <div className={styles.calloutIcon}>
              <HeartPulse aria-hidden size={21} />
            </div>
            <h2>Virtual Care</h2>
            <p>
              Prefer to stay home? Book a virtual session and consult with our physicians from the
              comfort of your living room.
            </p>
            <Link href="/services/telemedicine">
              Schedule Telemedicine
              <ArrowRight aria-hidden size={18} />
            </Link>
          </div>

          <div className={styles.infoBlock}>
            <h2>Visit Our Clinic</h2>
            <address>
              14 Chief Elechi Amadi Road,
              <br />
              Rumuokwurushi,
              <br />
              Port Harcourt, Nigeria
            </address>
          </div>

          <div className={styles.infoBlock}>
            <h2>Direct Lines</h2>
            <div className={styles.phoneList}>
              <a href="tel:+2349074487448">
                <Phone aria-hidden size={19} />
                +234 907 448 7448
              </a>
              <a href="tel:+2349134301436">
                <Phone aria-hidden size={19} />
                +234 913 430 1436
              </a>
            </div>
          </div>

          <div className={styles.mapShell}>
            <iframe
              aria-label="Map showing Maryland Healthcare at Chief Elechi Amadi Road, Rumuokwurushi, Port Harcourt"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=14%20Chief%20Elechi%20Amadi%20Road%2C%20Rumuokwurushi%2C%20Port%20Harcourt%2C%20Nigeria&output=embed"
              title="Maryland Healthcare location map"
            />
            <div className={styles.mapPin}>
              <MapPin aria-hidden size={18} />
              Maryland Healthcare, Port Harcourt
            </div>
          </div>
        </motion.div>

        <motion.div
          className={styles.formColumn}
          id="appointment-form"
          initial={reveal}
          transition={{ duration: 0.75, ease, delay: 0.16 }}
          viewport={{ amount: 0.25, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2>Request an Appointment</h2>
          <form className={styles.form} onSubmit={handleAppointmentSubmit}>
            <div className={styles.twoColumn}>
              <label>
                <span>First Name</span>
                <input autoComplete="given-name" name="firstName" required type="text" />
              </label>
              <label>
                <span>Last Name</span>
                <input autoComplete="family-name" name="lastName" required type="text" />
              </label>
            </div>

            <div className={styles.twoColumn}>
              <label>
                <span>Email</span>
                <input autoComplete="email" name="email" required type="email" />
              </label>
              <label>
                <span>Phone</span>
                <input autoComplete="tel" name="phone" required type="tel" />
              </label>
            </div>

            <label>
              <span>Preferred Date</span>
              <input name="preferredDate" required type="date" />
            </label>

            <label>
              <span>Reason for Visit</span>
              <textarea name="reason" required rows={3} />
            </label>

            <div className={styles.submitRow}>
              <button type="submit">
                Submit Request
                <Send aria-hidden size={18} />
              </button>
              <p>Our care team will contact you shortly to confirm your appointment details.</p>
            </div>
          </form>
        </motion.div>
      </section>
    </main>
  );
}
