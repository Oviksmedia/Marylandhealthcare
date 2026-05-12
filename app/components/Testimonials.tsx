"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./Testimonials.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const testimonials = [
  {
    quote:
      "My mother first came here when I was a child. Today, Maryland Healthcare still has that rare feeling of doctors who remember your story before they open your file.",
    name: "Nneka Nwosu",
    since: "Patient since 1998",
  },
  {
    quote:
      "My company uses Maryland through our HMO, and every visit has been calm and organized. The doctors explain things clearly and follow up like it matters.",
    name: "Tunde Bakare",
    since: "AxaMansard HMO member",
  },
  {
    quote:
      "Telemedicine helped me get care during a hectic work week. It still felt like Maryland: personal, direct, and reassuring.",
    name: "Blessing Amadi",
    since: "Solewant LLC employee",
  },
  {
    quote:
      "When my father needed urgent attention at night, the emergency team moved quickly without making us feel rushed. That balance is why we keep coming back.",
    name: "Chinyere Dike",
    since: "Patient since 2007",
  },
  {
    quote:
      "Maryland has cared for three generations of my family. They combine modern medicine with the kind of patience you rarely find anymore.",
    name: "Emeka Worlu",
    since: "Family patient since 1992",
  },
  {
    quote:
      "From reception to consultation, everything feels steady and respectful. I always leave understanding what happened and what to do next.",
    name: "Amina Bello",
    since: "Patient since 2016",
  },
  {
    quote:
      "The maternity support gave my wife and me confidence at every stage. They were attentive, practical, and genuinely kind.",
    name: "Ifeoma Briggs",
    since: "Family care patient",
  },
  {
    quote:
      "I was referred for diagnostics and stayed because of the experience. The team was thorough, careful, and never dismissive.",
    name: "Damilola Hart",
    since: "Patient since 2021",
  },
];

function TestimonialCard({ testimonial }: { testimonial: (typeof testimonials)[number] }) {
  return (
    <article className={styles.card}>
      <span aria-hidden className={styles.quoteMark}>
        &rdquo;
      </span>
      <p className={styles.quote}>{testimonial.quote}</p>
      <div className={styles.person}>
        <div aria-hidden className={styles.avatar}>
          {testimonial.name.charAt(0)}
        </div>
        <div>
          <h3>{testimonial.name}</h3>
          <p>{testimonial.since}</p>
        </div>
      </div>
    </article>
  );
}

export default function Testimonials() {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? false : { opacity: 0, y: 24 };

  return (
    <section className={styles.section} id="insights">
      <div className="container">
        <motion.div
          className={styles.header}
          initial={initial}
          transition={{ duration: 0.7, ease }}
          viewport={{ amount: 0.3, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p>Generational Stories</p>
          <h2>Trusted by Families for 44 Years</h2>
        </motion.div>

        <div aria-label="Patient testimonials" className={styles.marquee}>
          <div className={styles.track}>
            <div className={styles.cardSet}>
              {testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.name} testimonial={testimonial} />
              ))}
            </div>
            <div aria-hidden className={styles.cardSet}>
              {testimonials.map((testimonial) => (
                <TestimonialCard key={`${testimonial.name}-duplicate`} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.staticGrid}>
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
