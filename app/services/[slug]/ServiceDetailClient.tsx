"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, PhoneCall, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import type { Service } from "../servicesData";
import styles from "./serviceDetail.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

type ServiceDetailClientProps = {
  service: Service;
  relatedServices: Service[];
};

export default function ServiceDetailClient({ relatedServices, service }: ServiceDetailClientProps) {
  const prefersReducedMotion = useReducedMotion();
  const reveal = prefersReducedMotion ? false : { opacity: 0, y: 28 };
  const slideLeft = prefersReducedMotion ? false : { opacity: 0, x: -32 };
  const slideRight = prefersReducedMotion ? false : { opacity: 0, x: 32 };
  const isEmergency = service.slug === "emergency-trauma";

  function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <>
      <section className={styles.hero} aria-labelledby="service-title">
        <Image
          alt={service.imageAlt}
          className={styles.heroImage}
          fill
          priority
          sizes="100vw"
          src={service.image}
        />
        <div aria-hidden className={styles.heroOverlay} />

        <div className={`container ${styles.heroContent}`}>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={styles.heroCopy}
            initial={reveal}
            transition={{ duration: 0.75, ease, delay: 0.12 }}
          >
            <p>
              {service.number} / {service.eyebrow}
            </p>
            <h1 id="service-title">{service.title}</h1>
            <span>{service.detail.heroTagline}</span>
            {isEmergency ? (
              <a className={styles.emergencyPhone} href="tel:+2349074487448">
                <PhoneCall aria-hidden size={20} />
                0907 448 7448
              </a>
            ) : null}
          </motion.div>
        </div>
      </section>

      <section className={styles.editorial}>
        <div className={`container ${styles.editorialGrid}`}>
          <motion.article
            className={styles.article}
            initial={slideLeft}
            transition={{ duration: 0.75, ease }}
            viewport={{ amount: 0.25, once: true }}
            whileInView={{ opacity: 1, x: 0 }}
          >
            <p className={styles.lead}>{service.detail.opening}</p>
            <blockquote>{service.detail.pullQuote}</blockquote>
            {service.detail.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </motion.article>

          <motion.aside
            className={styles.sidebar}
            initial={slideRight}
            transition={{ duration: 0.75, ease, delay: 0.08 }}
            viewport={{ amount: 0.25, once: true }}
            whileInView={{ opacity: 1, x: 0 }}
          >
            <div className={styles.offerCard}>
              <h2>What We Offer</h2>
              <ul>
                {service.detail.offers.map((offer) => (
                  <li key={offer}>
                    <span aria-hidden />
                    {offer}
                  </li>
                ))}
              </ul>
            </div>

            {isEmergency ? (
              <a className={styles.sidebarEmergency} href="tel:+2349074487448">
                <span>Emergency line</span>
                <strong>0907 448 7448</strong>
              </a>
            ) : null}

            <p className={styles.idealSummary}>{service.detail.idealSummary}</p>
          </motion.aside>
        </div>
      </section>

      <section className={styles.inquiry} aria-labelledby="service-question-heading">
        <motion.div
          className={styles.inquiryInner}
          initial={reveal}
          transition={{ duration: 0.75, ease }}
          viewport={{ amount: 0.3, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2 id="service-question-heading">Have a Question About {service.title}?</h2>
          <p>Our care team is here to help. Send us a message and we&apos;ll respond within 24 hours.</p>

          <form className={styles.form} onSubmit={handleQuestionSubmit}>
            <label>
              <span>Name</span>
              <input autoComplete="name" name="name" required type="text" />
            </label>
            <label>
              <span>Email or Phone</span>
              <input autoComplete="email" name="contact" required type="text" />
            </label>
            <label>
              <span>Your Question</span>
              <textarea name="question" required rows={3} />
            </label>
            <button type="submit">
              <Send aria-hidden size={18} />
              Send Message
            </button>
          </form>
        </motion.div>
      </section>

      <section className={styles.related} aria-labelledby="related-services-heading">
        <div className="container">
          <motion.div
            className={styles.relatedHeader}
            initial={reveal}
            transition={{ duration: 0.7, ease }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="eyebrow">Continue Exploring</p>
            <h2 id="related-services-heading">Explore More Services</h2>
          </motion.div>

          <div className={styles.relatedGrid}>
            {relatedServices.map((related, index) => (
              <motion.article
                className={styles.relatedCard}
                initial={reveal}
                key={related.slug}
                transition={{ duration: 0.7, ease, delay: index * 0.1 }}
                viewport={{ amount: 0.25, once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <Link aria-label={`Learn more about ${related.title}`} href={`/services/${related.slug}`}>
                  <span className={styles.relatedImage}>
                    <Image
                      alt={related.imageAlt}
                      fill
                      sizes="(max-width: 900px) 100vw, 30vw"
                      src={related.image}
                    />
                  </span>
                  <span className={styles.relatedBody}>
                    <strong>{related.title}</strong>
                    <span>{related.description}</span>
                    <em>
                      Learn More <ArrowRight aria-hidden size={16} />
                    </em>
                  </span>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
