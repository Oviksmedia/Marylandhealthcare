"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import styles from "./leadership.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const doctors = [
  {
    name: "Dr. Florence Thomos",
    image: "/leadership/dr-florence-thomos.png",
    alt: "Portrait of Dr. Florence Thomos",
    aspect: "portrait",
    offset: "offsetOne",
  },
  {
    name: "Dr. Chinazo Dike",
    image: "/leadership/dr-chinazo-dike.png",
    alt: "Portrait of Dr. Chinazo Dike",
    aspect: "square",
    offset: "offsetTwo",
  },
  {
    name: "Dr. Daniel Erondu",
    image: "/leadership/dr-daniel-erondu.png",
    alt: "Portrait of Dr. Daniel Erondu",
    aspect: "portrait",
    offset: "offsetThree",
  },
  {
    name: "Dr. Uchenna Chichi",
    image: "/leadership/dr-uchenna-chichi.png",
    alt: "Portrait of Dr. Uchenna Chichi",
    aspect: "square",
    offset: "offsetOne",
  },
  {
    name: "Dr. Toochi Ibe",
    image: "/leadership/dr-toochi-ibe.png",
    alt: "Portrait of Dr. Toochi Ibe",
    aspect: "portrait",
    offset: "offsetTwo",
  },
  {
    name: "Dr. Alex",
    image: "/leadership/dr-alex.jpg",
    alt: "Portrait of Dr. Alex",
    aspect: "square",
    offset: "offsetThree",
  },
];

export default function LeadershipClient() {
  return (
    <main className={styles.page}>
      <motion.section
        className={styles.header}
        initial={false}
        transition={{ duration: 0.75, ease }}
        viewport={{ amount: 0.35, once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div className={styles.headerInner}>
          <p className="eyebrow">Medical Leadership</p>
          <h1>Guided by Experience. Driven by Care.</h1>
          <span>
            For over 44 years, our leadership has maintained a standard of clinical excellence and
            compassionate care. We are an institution built on generations of trust, grounded in
            precision, and dedicated to the human relationships that define true healing.
          </span>
        </div>
      </motion.section>

      <section className={styles.cmdSection} aria-labelledby="cmd-heading">
        <div className={styles.cmdGrid}>
          <motion.div
            className={styles.cmdCopy}
            initial={false}
            transition={{ duration: 0.75, ease }}
            viewport={{ amount: 0.25, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p>Chief Medical Director</p>
            <h2 id="cmd-heading">Dr. Stephen Ekwelibe</h2>
            <span>
              With an unwavering commitment to patient-centered care, Dr. Ekwelibe has guided
              Maryland Healthcare through decades of medical advancement. His philosophy centers on
              the enduring bond between physician and patient, where clinical precision meets deep
              empathy.
            </span>
            <blockquote>
              True healthcare is not merely the treatment of ailments, but the stewardship of trust
              over a lifetime.
            </blockquote>
            <div className={styles.establishedBadge}>
              <strong>Established 1982</strong>
              <span>44 Years of Practice</span>
            </div>
          </motion.div>

          <motion.div
            className={styles.cmdImageColumn}
            initial={false}
            transition={{ duration: 0.85, ease, delay: 0.08 }}
            viewport={{ amount: 0.25, once: true }}
            whileInView={{ opacity: 1, x: 0 }}
          >
            <div className={styles.cmdImageWrap}>
              <Image
                alt="Portrait of Dr. Stephen Ekwelibe"
                className={styles.cmdImage}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 40vw"
                src="/leadership/dr-stephen-ekwelibe.png"
              />
            </div>
            <div className={styles.trustBadge}>
              <strong>44</strong>
              <span>Years of Trust</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className={styles.teamSection} aria-labelledby="clinical-leadership-heading">
        <div className={styles.teamHeader}>
          <p className="eyebrow">Clinical Standard</p>
          <h2 id="clinical-leadership-heading">Our Clinical Leadership</h2>
          <span>
            A distinguished team of doctors united by a singular commitment to exceptional patient
            care.
          </span>
        </div>

        <div className={styles.teamGrid}>
          {doctors.map((doctor, index) => (
            <motion.article
              className={`${styles.doctorCard} ${styles[doctor.offset as keyof typeof styles]}`}
              initial={false}
              key={doctor.name}
              transition={{ duration: 0.7, ease, delay: index * 0.08 }}
              viewport={{ amount: 0.2, once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div
                className={`${styles.doctorImageWrap} ${
                  doctor.aspect === "square" ? styles.square : styles.portrait
                }`}
              >
                <Image
                  alt={doctor.alt}
                  className={styles.doctorImage}
                  fill
                  sizes="(max-width: 900px) 100vw, 30vw"
                  src={doctor.image}
                />
              </div>
              <h3>{doctor.name}</h3>
              <p>Medical Doctor</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className={styles.closing}>
        <h2>A Culture of Excellence.</h2>
        <p>
          Our leadership does not merely dictate policy; they actively foster a culture where every
          patient interaction is treated with profound respect and clinical rigor. It is this
          culture that has sustained Maryland Healthcare for over four decades.
        </p>
      </section>
    </main>
  );
}
