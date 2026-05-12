import { AlertCircle, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Footer.module.css";

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/marylandhealthcareph/",
    path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.5l.5-4h-4V7a1 1 0 0 1 1-1h3z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/marylandhealthcareph/",
    path: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 6.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2zm5.25-.95a1.05 1.05 0 1 0 0-2.1 1.05 1.05 0 0 0 0 2.1z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/mhcportharcourt/",
    path: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.65h.06A4.16 4.16 0 0 1 17.6 8.6c4 0 4.75 2.64 4.75 6.07V21h-4v-5.6c0-1.34-.03-3.05-1.86-3.05-1.86 0-2.15 1.45-2.15 2.95V21H10z",
  },
  {
    label: "X",
    href: "https://x.com/marylandhc_ph",
    path: "M18.9 2h3.1l-6.8 7.78L23.2 22h-6.28l-4.92-6.43L6.37 22H3.26l7.28-8.32L2.86 2h6.44l4.45 5.88z",
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer} id="contact">
      <div className={`container ${styles.grid}`}>
        <div className={styles.brandColumn}>
          <Link className={styles.brandLockup} href="/">
            <span className={styles.logoSeal}>
              <Image
                alt=""
                className={styles.logo}
                height={40}
                src="/logo.png"
                width={76}
              />
            </span>
            <span>
              <strong>Maryland Healthcare</strong>
              <em>Family Healthcare Since 1982</em>
            </span>
          </Link>
          <p>Providing premier family healthcare services in Port Harcourt for over 44 years.</p>
          <div className={styles.socials}>
            {socialLinks.map((social) => (
              <a
                aria-label={`Visit Maryland Healthcare on ${social.label}`}
                href={social.href}
                key={social.label}
                rel="noopener noreferrer"
                target="_blank"
              >
                <svg aria-hidden fill="currentColor" viewBox="0 0 24 24">
                  <path d={social.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className={styles.linkColumn}>
          <h2>Directory</h2>
          <Link href="/services">Services</Link>
          <Link href="/services/telemedicine">Telemedicine</Link>
          <Link href="/leadership">Medical Leadership</Link>
          <Link href="/about">Our Legacy</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/book">Book Appointment</Link>
          <Link href="/contact">Contact Us</Link>
        </div>

        <div className={styles.contactColumn}>
          <h2>Find Us</h2>
          <p>
            <MapPin aria-hidden size={18} />
            14 Chief Elechi Amadi Road, Rumuokwurushi, Port Harcourt, Rivers State, Nigeria
          </p>
          <p>
            <Mail aria-hidden size={18} />
            info@marylandhealthcare.com.ng
          </p>
          <p>
            <Phone aria-hidden size={18} />
            +234 913 430 1436
          </p>
        </div>

        <div className={styles.emergencyBox}>
          <div className={styles.emergencyLabel}>
            <AlertCircle aria-hidden size={18} />
            <span>Emergency Line</span>
          </div>
          <a href="tel:+2349074487448">0907 448 7448</a>
          <p>Immediate 24/7 trauma support from Maryland Healthcare&apos;s emergency team.</p>
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <p>Copyright 2026 Maryland Healthcare. Established 1982. All rights reserved.</p>
        <div>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
