"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { servicesData } from "./servicesData";
import styles from "./services.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function ServicesIndexClient() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className={styles.servicesList} aria-label="Maryland Healthcare services">
      <div className={styles.listInner}>
        {servicesData.map((service, index) => {
          const isEven = index % 2 === 1;
          const imageInitial = prefersReducedMotion
            ? false
            : { opacity: 0, x: isEven ? -40 : 40 };
          const textInitial = prefersReducedMotion ? false : { opacity: 0, y: 32 };

          return (
            <motion.article
              className={`${styles.serviceArticle} ${isEven ? styles.even : styles.odd}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 26 }}
              key={service.slug}
              transition={{ duration: 0.7, ease }}
              viewport={{ amount: 0.25, once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <motion.div
                className={styles.serviceText}
                initial={textInitial}
                transition={{ duration: 0.75, ease, delay: 0.08 }}
                viewport={{ amount: 0.25, once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <span className={styles.serviceEyebrow}>
                  {service.number} / {service.eyebrow}
                </span>
                <h2>{service.title}</h2>
                <p className={styles.description}>{service.description}</p>

                <div className={styles.idealBox}>
                  <p>Ideal For:</p>
                  <span>{service.idealFor}</span>
                </div>

                <Link className={styles.cta} href={`/services/${service.slug}`}>
                  {service.ctaLabel}
                  <ArrowRight aria-hidden size={18} />
                </Link>
              </motion.div>

              <motion.div
                className={`${styles.serviceImageWrap} ${
                  service.aspectRatio === "landscape"
                    ? styles.landscapeImage
                    : service.aspectRatio === "portrait"
                      ? styles.portraitImage
                      : service.aspectRatio === "square"
                        ? styles.squareImage
                        : isEven
                          ? styles.squareImage
                          : styles.portraitImage
                }`}
                initial={imageInitial}
                transition={{ duration: 0.85, ease, delay: 0.14 }}
                viewport={{ amount: 0.25, once: true }}
                whileInView={{ opacity: 1, x: 0 }}
              >
                <Image
                  alt={service.imageAlt}
                  className={styles.serviceImage}
                  fill
                  sizes="(max-width: 768px) 100vw, 42vw"
                  src={service.image}
                />
              </motion.div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
