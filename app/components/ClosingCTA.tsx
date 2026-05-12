"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, UsersRound } from "lucide-react";
import Link from "next/link";
import styles from "./ClosingCTA.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function ClosingCTA() {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? false : { opacity: 0, y: 24 };

  return (
    <section className={styles.section} id="book">
      <motion.div
        className={`container ${styles.inner}`}
        initial={initial}
        transition={{ duration: 0.7, ease }}
        viewport={{ amount: 0.35, once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div className={styles.copy}>
          <h2>Begin Your Journey With Us</h2>
          <p>
            Whether you need a routine check-up, specialized care, or a long-term family hospital,
            our doors are open.
          </p>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryCta} href="/book">
            Schedule an Appointment
            <ArrowRight aria-hidden size={19} />
          </Link>
          <Link className={styles.ghostCta} href="/leadership">
            <UsersRound aria-hidden size={19} />
            Explore Our Specialists
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
