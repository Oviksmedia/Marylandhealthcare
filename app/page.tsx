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
      <main>
        <Hero />
        <HMOTrust />
        <Telemedicine />
        <CMDSection />
        <PracticePillars />
        <Testimonials />
        <ClosingCTA />
      </main>
      <Footer />
    </>
  );
}
