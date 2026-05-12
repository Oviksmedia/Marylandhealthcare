import type { Metadata } from "next";
import Footer from "../components/Footer";
import Nav from "../components/Nav";
import LeadershipClient from "./LeadershipClient";

export const metadata: Metadata = {
  title: "Medical Leadership | Maryland Healthcare",
  description:
    "Meet the medical leadership team guiding Maryland Healthcare's 44-year standard of clinical excellence in Port Harcourt.",
};

export default function LeadershipPage() {
  return (
    <>
      <Nav />
      <LeadershipClient />
      <Footer />
    </>
  );
}
