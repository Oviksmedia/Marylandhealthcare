"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getFeaturedInsight, getSecondaryInsights } from "./insightsData";
import styles from "./insights.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function InsightsClient() {
  const prefersReducedMotion = useReducedMotion();
  const reveal = prefersReducedMotion ? false : { opacity: 0, y: 26 };
  const featured = getFeaturedInsight();
  const secondary = getSecondaryInsights();

  return (
    <main className={styles.page}>
      <motion.section
        className={styles.header}
        initial={reveal}
        transition={{ duration: 0.75, ease }}
        viewport={{ amount: 0.3, once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div className={styles.headerInner}>
          <div>
            <p>Editorial Journal</p>
            <h1>Insight</h1>
          </div>
          <span>
            Exploring the intersection of historic legacy and modern wellness through careful
            observation and enduring care.
          </span>
        </div>
      </motion.section>

      <section className={styles.featuredWrap} aria-label="Featured insight">
        <motion.article
          className={styles.featured}
          initial={reveal}
          transition={{ duration: 0.75, ease, delay: 0.08 }}
          viewport={{ amount: 0.25, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <Link href={`/insights/${featured.slug}`}>
            <span className={styles.featuredImage}>
              <Image
                alt={featured.imageAlt}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 66vw"
                src={featured.image}
              />
            </span>
            <span className={styles.featuredBody}>
              <span className={styles.category}>{featured.category}</span>
              <strong>{featured.title}</strong>
              <span className={styles.excerpt}>{featured.excerpt}</span>
              <span className={styles.meta}>
                <span>{featured.date}</span>
                <em>
                  Read More
                  <ArrowRight aria-hidden size={17} />
                </em>
              </span>
            </span>
          </Link>
        </motion.article>
      </section>

      <section className={styles.gridSection} aria-label="More insights">
        <div className={styles.grid}>
          {secondary.map((insight, index) => (
            <motion.article
              className={styles.card}
              initial={reveal}
              key={insight.slug}
              transition={{ duration: 0.7, ease, delay: index * 0.1 }}
              viewport={{ amount: 0.2, once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <Link href={`/insights/${insight.slug}`}>
                <span className={styles.cardImage}>
                  <Image
                    alt={insight.imageAlt}
                    fill
                    sizes="(max-width: 900px) 100vw, 30vw"
                    src={insight.image}
                  />
                </span>
                <span className={styles.cardBody}>
                  <span className={styles.category}>{insight.category}</span>
                  <strong>{insight.title}</strong>
                  <span className={styles.cardExcerpt}>{insight.excerpt}</span>
                  <span className={styles.meta}>
                    <span>{insight.date}</span>
                    <em>
                      Read More
                      <ArrowRight aria-hidden size={16} />
                    </em>
                  </span>
                </span>
              </Link>
            </motion.article>
          ))}
        </div>
      </section>
    </main>
  );
}
