"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, UsersRound } from "lucide-react";
import Link from "next/link";
import Footer from "../components/Footer";
import Nav from "../components/Nav";
import styles from "./about.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const milestones = [
  {
    year: "1982",
    title: "The Foundation",
    body: "Our doors first opened at 42 Igbokwe St, rooted in a promise of unhurried excellence. A commitment to deeply knowing every family that walked into our clinic.",
    tone: "teal",
  },
  {
    year: "1995",
    title: "Expansion of Care",
    body: "Establishing ourselves as Port Harcourt's trusted anchor for family medicine and specialized diagnostics. Growing our footprint without losing our personal touch.",
    tone: "warm",
  },
  {
    year: "2010",
    title: "Three Generations Deep",
    body: "Under the leadership of Dr. Stephen Ekwelibe, the hospital begins treating the grandchildren of its very first patients, cementing its status as Port Harcourt's premier family hospital.",
    tone: "teal",
  },
  {
    year: "Today",
    title: "Modern Access. Classic Care.",
    body: "Offering 9 specialized departments, 24/7 trauma care, and Telemedicine, while fiercely protecting the personal doctor-patient relationship we started with.",
    tone: "warm",
  },
];

export default function AboutPage() {
  const prefersReducedMotion = useReducedMotion();
  const fadeUp = prefersReducedMotion ? false : { opacity: 0, y: 24 };

  return (
    <>
      <Nav />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroInner}>
              <span aria-hidden className={styles.watermark}>
                Est.
              </span>
              <p>Our Legacy</p>
              <h1>A Trusted Anchor</h1>
              <span>
                Tracing 44 years of dedicated medical service, built on the timeless foundation of
                the doctor-patient relationship.
              </span>
            </div>
          </div>
        </section>

        <section className={styles.timelineSection} aria-label="Maryland Healthcare timeline">
          <div className={`container ${styles.timeline}`}>
            <div aria-hidden className={styles.centerLine} />

            {milestones.map((milestone, index) => (
              <motion.article
                className={`${styles.node} ${index % 2 === 0 ? styles.nodeRight : styles.nodeLeft}`}
                initial={fadeUp}
                key={milestone.year}
                transition={{ duration: 0.7, ease, delay: 0.08 }}
                viewport={{ amount: 0.35, once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <div aria-hidden className={styles.dot} />
                <motion.div
                  className={`${styles.year} ${milestone.tone === "warm" ? styles.warm : styles.teal}`}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                  transition={{ duration: 0.65, ease, delay: 0.1 }}
                  viewport={{ amount: 0.35, once: true }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  {milestone.year}
                </motion.div>
                <motion.div
                  className={styles.content}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                  transition={{ duration: 0.65, ease, delay: 0.2 }}
                  viewport={{ amount: 0.35, once: true }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <h2>{milestone.title}</h2>
                  <p>{milestone.body}</p>
                </motion.div>
              </motion.article>
            ))}
          </div>
        </section>

        <motion.section
          className={`container ${styles.leadershipBridge}`}
          initial={fadeUp}
          transition={{ duration: 0.7, ease }}
          viewport={{ amount: 0.35, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div>
            <p>Medical Leadership</p>
            <h2>The people entrusted with the standard.</h2>
          </div>
          <span>
            Meet the physicians carrying Maryland Healthcare&apos;s legacy into its next chapter,
            from long-standing clinical judgment to modern specialist care.
          </span>
          <Link href="/leadership">
            <UsersRound aria-hidden size={19} />
            Meet Our Medical Leadership
            <ArrowRight aria-hidden size={18} />
          </Link>
        </motion.section>
      </main>
      <Footer />
    </>
  );
}
