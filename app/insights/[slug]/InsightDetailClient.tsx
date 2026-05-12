"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Send } from "lucide-react";
import Image from "next/image";
import type { FormEvent } from "react";
import type { Insight } from "../insightsData";
import styles from "./insightDetail.module.css";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function InsightDetailClient({ insight }: { insight: Insight }) {
  const prefersReducedMotion = useReducedMotion();
  const reveal = prefersReducedMotion ? false : { opacity: 0, y: 26 };

  function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <>
      <article className={styles.article}>
        <motion.header
          className={styles.header}
          initial={reveal}
          transition={{ duration: 0.75, ease }}
          viewport={{ amount: 0.3, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p>{insight.category}</p>
          <h1>{insight.title}</h1>
          <span>
            {insight.date} / Written by {insight.author}
          </span>
          <div className={styles.leadImage}>
            <Image
              alt={insight.imageAlt}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 800px"
              src={insight.image}
            />
          </div>
        </motion.header>

        <motion.div
          className={styles.body}
          initial={reveal}
          transition={{ duration: 0.75, ease, delay: 0.08 }}
          viewport={{ amount: 0.2, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          {insight.body.map((block, index) => {
            if (block.type === "heading") {
              return <h2 key={`${block.type}-${index}`}>{block.content}</h2>;
            }

            if (block.type === "quote") {
              return <blockquote key={`${block.type}-${index}`}>{block.content}</blockquote>;
            }

            if (block.type === "list") {
              return (
                <ul key={`${block.type}-${index}`}>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            }

            return <p key={`${block.type}-${index}`}>{block.content}</p>;
          })}
        </motion.div>
      </article>

      <section className={styles.question} aria-labelledby="insight-question-heading">
        <motion.div
          className={styles.questionInner}
          initial={reveal}
          transition={{ duration: 0.75, ease }}
          viewport={{ amount: 0.25, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2 id="insight-question-heading">Have a question about this topic?</h2>
          <p>Our medical team is available to provide clarity. Send us a secure message.</p>
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
              <span>Message</span>
              <textarea name="message" required rows={3} />
            </label>
            <button type="submit">
              <Send aria-hidden size={18} />
              Send Message
            </button>
          </form>
        </motion.div>
      </section>
    </>
  );
}
