import type { Metadata } from "next";
import Footer from "../components/Footer";
import Nav from "../components/Nav";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact Us | Maryland Healthcare",
  description:
    "Contact Maryland Healthcare in Port Harcourt, request an appointment, book virtual care, or find our location at 14 Chief Elechi Amadi Road, Rumuokwurushi.",
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <ContactClient />
      <Footer />
    </>
  );
}
