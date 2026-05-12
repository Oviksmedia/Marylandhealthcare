"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, Infinity, Landmark } from "lucide-react";
import Link from "next/link";
import styles from "./PracticePillars.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const pillars = [
  {
    title: "Continuity",
    body: "We build long-term relationships over transactional encounters. Our care plans are designed to evolve with you, supporting a seamless medical journey through every stage of life.",
    Icon: Infinity,
  },
  {
    title: "Recognition",
    body: "Every patient is known, heard, and valued. We prioritize deeply personalized care, drawing on decades of collective experience to understand your unique health narrative.",
    Icon: BadgeCheck,
  },
  {
    title: "Authority",
    body: "Grounded in rigorous medical standards, our clinical decisions are authoritative yet accessible. We provide clarity and confidence in complex medical situations.",
    Icon: Landmark,
  },
];

export default function PracticePillars() {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? false : { opacity: 0, y: 24 };

  return (
    <section className={styles.section} aria-labelledby="practice-pillars">
      <div className="container">
        <motion.div
          className={styles.header}
          initial={initial}
          transition={{ duration: 0.7, ease }}
          viewport={{ amount: 0.35, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p>Our Tenets</p>
          <h2 id="practice-pillars">The Pillars of Our Practice</h2>
        </motion.div>

        <div className={styles.grid}>
          {pillars.map(({ Icon, body, title }, index) => (
            <motion.article
              className={styles.pillar}
              initial={initial}
              key={title}
              transition={{ duration: 0.7, ease, delay: index * 0.12 }}
              viewport={{ amount: 0.35, once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div aria-hidden className={styles.rule} />
              <Icon aria-hidden className={styles.icon} size={28} strokeWidth={2.1} />
              <h3>{title}</h3>
              <p>{body}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          className={styles.ctaRow}
          initial={initial}
          transition={{ duration: 0.7, ease, delay: 0.36 }}
          viewport={{ amount: 0.35, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <Link href="/services">
            Explore Our Services
            <ArrowRight aria-hidden size={18} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
