"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileText, PlayCircle, Shield, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Telemedicine.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const features = [
  { label: "Real-time Video Consults", Icon: Video },
  { label: "Same CMD-level Expertise", Icon: Shield },
  { label: "Digital Prescriptions", Icon: FileText },
];

export default function Telemedicine() {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? false : { opacity: 0, y: 24 };

  return (
    <section className={styles.section} id="telemedicine">
      <Image
        alt="Patient consulting a Maryland Healthcare doctor by video from home"
        className={styles.background}
        fill
        sizes="100vw"
        src="/telemedicine.png"
      />
      <div aria-hidden className={styles.overlay} />

      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <motion.p
            className={styles.eyebrow}
            initial={initial}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Care Without The Commute
          </motion.p>

          <motion.h2
            initial={initial}
            transition={{ duration: 0.7, ease, delay: 0.2 }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Your Doctor Is Always Within Reach.
          </motion.h2>

          <motion.p
            className={styles.lede}
            initial={initial}
            transition={{ duration: 0.7, ease, delay: 0.3 }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Skip the Port Harcourt traffic. Consult with the same trusted doctors you&apos;ve known
            for decades, right from your sofa.
          </motion.p>

          <motion.div
            className={styles.features}
            initial={initial}
            transition={{ duration: 0.7, ease, delay: 0.4 }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            {features.map(({ Icon, label }) => (
              <div className={styles.feature} key={label}>
                <Icon aria-hidden size={21} />
                <span>{label}</span>
              </div>
            ))}
          </motion.div>

          <motion.div
            className={styles.actions}
            initial={initial}
            transition={{ duration: 0.7, ease, delay: 0.5 }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <Link className={styles.primaryCta} href="/book">
              Book a Virtual Session
              <ArrowRight aria-hidden size={19} />
            </Link>
            <Link className={styles.ghostCta} href="/services/telemedicine">
              <PlayCircle aria-hidden size={19} />
              How It Works
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
