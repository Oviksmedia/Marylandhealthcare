"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./Hero.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const stats = [
  { value: 44, suffix: "", label: "Years of Care" },
  { value: 3, suffix: "", label: "Generations Served" },
  { value: 28, suffix: "+", label: "Trusted Partners" },
];

export default function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { amount: 0.5, once: true });
  const [counts, setCounts] = useState(() => stats.map(() => 0));
  const initial = prefersReducedMotion ? false : { opacity: 0, y: 24 };
  const imageInitial = prefersReducedMotion ? false : { opacity: 0, scale: 1.02 };

  useEffect(() => {
    if (!statsInView) {
      return;
    }

    if (prefersReducedMotion) {
      return;
    }

    const duration = 1100;
    const startedAt = performance.now();
    let animationFrame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setCounts(stats.map((stat) => Math.round(stat.value * eased)));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, [prefersReducedMotion, statsInView]);

  return (
    <section className={styles.hero}>
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className={styles.imageLayer}
        initial={imageInitial}
        transition={{ duration: 1.2, ease }}
      >
        <Image
          alt="Warm, modern consultation room at Maryland Healthcare clinic"
          className={styles.heroImage}
          fill
          priority
          sizes="100vw"
          src="/hero-main.png"
        />
      </motion.div>
      <div aria-hidden className={styles.overlay} />

      <div className={`container ${styles.contentGrid}`}>
        <div className={styles.copy}>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={styles.badge}
            initial={initial}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
          >
            <span aria-hidden />
            Since 1982
          </motion.div>

          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            initial={initial}
            transition={{ duration: 0.7, ease, delay: 0.2 }}
          >
            44 Years of Trusted Care
          </motion.h1>

          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className={styles.tagline}
            initial={initial}
            transition={{ duration: 0.7, ease, delay: 0.25 }}
          >
            Still Here. Still Yours.
          </motion.p>

          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className={styles.lede}
            initial={initial}
            transition={{ duration: 0.7, ease, delay: 0.35 }}
          >
            A legacy of institutional excellence, blending generations of
            medical expertise with a personal commitment to your health.
          </motion.p>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={styles.actions}
            initial={initial}
            transition={{ duration: 0.7, ease, delay: 0.4 }}
          >
            <Link className={styles.primaryCta} href="/services">
              Explore Services
              <ArrowRight aria-hidden size={20} />
            </Link>
            <Link className={styles.ghostCta} href="/book">
              Virtual Visit
              <Video aria-hidden size={19} />
            </Link>
          </motion.div>
        </div>
      </div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={styles.statsWrap}
        initial={initial}
        transition={{ duration: 0.7, ease, delay: 0.5 }}
      >
        <div className={styles.statsBar} ref={statsRef}>
          {stats.map((stat, index) => (
            <div className={styles.stat} key={stat.label}>
              <strong>
                {prefersReducedMotion ? stat.value : counts[index]}
                {stat.suffix}
              </strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div
        animate={{ opacity: 1 }}
        className={styles.scrollIndicator}
        initial={{ opacity: 0 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <div className={styles.mouse}>
          <div className={styles.wheel} />
        </div>
        <span>Scroll</span>
      </motion.div>
    </section>
  );
}
