import type { Metadata } from "next";
import BookingClient from "./BookingClient";

export const metadata: Metadata = {
  title: "Book Appointment | Maryland Healthcare",
  description:
    "Book an in-clinic visit or telemedicine consultation with Maryland Healthcare in Port Harcourt.",
};

export default function BookPage() {
  return <BookingClient />;
}
