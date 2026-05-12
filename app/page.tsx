import HMOTrust from "./components/HMOTrust";
import Hero from "./components/Hero";
import Nav from "./components/Nav";
import Telemedicine from "./components/Telemedicine";
import CMDSection from "./components/CMDSection";
import ClosingCTA from "./components/ClosingCTA";
import Footer from "./components/Footer";
import PracticePillars from "./components/PracticePillars";
import Testimonials from "./components/Testimonials";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className={styles.home}>
        <Hero />
        <div className={styles.stackScene} aria-label="Maryland Healthcare homepage sections">
          <div className={styles.stackLayer}>
            <div className={styles.stackSurface}>
              <HMOTrust />
            </div>
          </div>
          <div className={styles.stackLayer}>
            <div className={styles.stackSurface}>
              <Telemedicine />
            </div>
          </div>
          <div className={styles.stackLayer}>
            <div className={styles.stackSurface}>
              <CMDSection />
            </div>
          </div>
          <div className={styles.stackLayer}>
            <div className={styles.stackSurface}>
              <PracticePillars />
            </div>
          </div>
          <div className={styles.stackLayer}>
            <div className={styles.stackSurface}>
              <Testimonials />
            </div>
          </div>
          <div className={styles.stackLayer}>
            <div className={styles.stackSurface}>
              <ClosingCTA />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
