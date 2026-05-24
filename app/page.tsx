import HMOTrust from "./components/HMOTrust";
import Hero from "./components/Hero";
import Nav from "./components/Nav";
import Telemedicine from "./components/Telemedicine";
import CMDSection from "./components/CMDSection";
import ClosingCTA from "./components/ClosingCTA";
import Footer from "./components/Footer";
import PracticePillars from "./components/PracticePillars";
import Testimonials from "./components/Testimonials";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <div className="stackScene" aria-label="Maryland Healthcare homepage sections">
          <div className="stackLayer">
            <div className="stackSurface">
              <HMOTrust />
            </div>
          </div>
          <div className="stackLayer">
            <div className="stackSurface">
              <Telemedicine />
            </div>
          </div>
          <div className="stackLayer">
            <div className="stackSurface">
              <CMDSection />
            </div>
          </div>
          <div className="stackLayer">
            <div className="stackSurface">
              <PracticePillars />
            </div>
          </div>
          <div className="stackLayer">
            <div className="stackSurface">
              <Testimonials />
            </div>
          </div>
          <div className="stackLayer">
            <div className="stackSurface">
              <ClosingCTA />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
