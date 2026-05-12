import type { Metadata } from "next";
import Footer from "../components/Footer";
import Nav from "../components/Nav";
import InsightsClient from "./InsightsClient";

export const metadata: Metadata = {
  title: "Insights | Maryland Healthcare",
  description:
    "Editorial perspectives from Maryland Healthcare on clinical excellence, patient experience, digital care, diagnostics, and community health in Port Harcourt.",
};

export default function InsightsPage() {
  return (
    <>
      <Nav />
      <InsightsClient />
      <Footer />
    </>
  );
}
