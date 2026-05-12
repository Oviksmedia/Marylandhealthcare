"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import styles from "./CMDSection.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function CMDSection() {
  const prefersReducedMotion = useReducedMotion();
  const fadeUp = prefersReducedMotion ? false : { opacity: 0, y: 24 };
  const slideIn = prefersReducedMotion ? false : { opacity: 0, x: 40 };

  return (
    <section className={styles.section} id="about">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <motion.p
            className={styles.eyebrow}
            initial={fadeUp}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Chief Medical Director&apos;s Vision
          </motion.p>

          <motion.h2
            initial={fadeUp}
            transition={{ duration: 0.7, ease, delay: 0.2 }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            A Legacy of Personalized Care
          </motion.h2>

          <motion.blockquote
            className={styles.quote}
            initial={fadeUp}
            transition={{ duration: 0.7, ease, delay: 0.3 }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <span aria-hidden>&ldquo;</span>
            <p>
              At Maryland Healthcare, we haven&apos;t simply grown over 44 years; we have deepened
              our roots in the community. True medical excellence isn&apos;t just about the latest
              equipment, it&apos;s about the enduring relationship between a physician and their
              patient. We are committed to unhurried, comprehensive care that honors the dignity of
              every individual who walks through our doors.
            </p>
          </motion.blockquote>

          <motion.div
            className={styles.signature}
            initial={fadeUp}
            transition={{ duration: 0.7, ease, delay: 0.4 }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div aria-hidden className={styles.signatureMark} />
            <div>
              <h3>Dr. Stephen Ekwelibe</h3>
              <p>Chief Medical Director, MD, FWACP</p>
              <span>
                <CheckCircle2 aria-hidden size={16} />
                Board Certified in Internal Medicine
              </span>
            </div>
          </motion.div>
        </div>

        <motion.div
          className={styles.portraitColumn}
          initial={slideIn}
          transition={{ duration: 0.8, ease, delay: 0.2 }}
          viewport={{ amount: 0.3, once: true }}
          whileInView={{ opacity: 1, x: 0 }}
        >
          <div className={styles.badge}>
            <span>Est.</span>
            <strong>1982</strong>
          </div>
          <div className={styles.portraitFrame}>
            <Image
              alt="Dr. Stephen Ekwelibe, Chief Medical Director of Maryland Healthcare"
              className={styles.portrait}
              fill
              sizes="(max-width: 960px) 86vw, 38vw"
              src="/cmd-portrait-doctor.webp"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
