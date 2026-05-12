import type { Metadata } from "next";
import Footer from "../components/Footer";
import Nav from "../components/Nav";
import ServicesIndexClient from "./ServicesIndexClient";
import styles from "./services.module.css";

export const metadata: Metadata = {
  title: "Services | Maryland Healthcare",
  description:
    "Explore Maryland Healthcare's family medicine, maternity, pediatrics, diagnostics, mental health, emergency, telemedicine, and specialist care services in Port Harcourt.",
};

export default function ServicesPage() {
  return (
    <>
      <Nav />
      <main className={styles.page}>
        <section className={styles.header} aria-labelledby="services-heading">
          <div className={styles.headerInner}>
            <p className="eyebrow">Maryland Healthcare Services</p>
            <h1 id="services-heading">Comprehensive Care For Every Stage of Life.</h1>
            <p>
              Providing a continuum of excellence, rooted in our 44-year legacy. Discover
              personalized health services designed for your enduring well-being.
            </p>
          </div>
        </section>

        <ServicesIndexClient />
      </main>
      <Footer />
    </>
  );
}
