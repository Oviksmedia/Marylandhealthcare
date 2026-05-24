"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CalendarCheck, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./Nav.module.css";

const links = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About Us" },
  { href: "/insights", label: "Insights" },
  { href: "/contact", label: "Contact Us" },
];

export default function Nav() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);

  const isActiveLink = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    document.body.dataset.scrollLock = isOpen ? "true" : "false";

    return () => {
      delete document.body.dataset.scrollLock;
    };
  }, [isOpen]);

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className={styles.header}
      initial={prefersReducedMotion ? false : { opacity: 0, y: -16 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <a className={styles.skipLink} href="#main">
        Skip to main content
      </a>
      <nav aria-label="Primary navigation" className={`container ${styles.nav}`}>
        <Link className={styles.brand} href="/" onClick={() => setIsOpen(false)}>
          <Image
            alt="Maryland Healthcare logo"
            className={styles.logo}
            height={56}
            priority
            src="/logo.png"
            width={123}
          />
        </Link>

        <div className={styles.desktopLinks}>
          {links.map((link) => (
            <Link
              className={isActiveLink(link.href) ? styles.activeLink : undefined}
              href={link.href}
              key={link.href}
              prefetch={false}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className={styles.desktopActions}>
          <a className={styles.emergencyButton} href="tel:+2349074487448">
            <AlertCircle aria-hidden size={18} />
            <span>24/7 Emergency</span>
            <strong>0907 448 7448</strong>
          </a>
          <Link className={styles.bookButton} href="/book">
            <CalendarCheck aria-hidden size={16} />
            <span>Book Appointment</span>
          </Link>
        </div>

        <button
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          className={styles.menuButton}
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          {isOpen ? <X aria-hidden size={24} /> : <Menu aria-hidden size={24} />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            animate={{ opacity: 1 }}
            className={styles.mobileBackdrop}
            exit={{ opacity: 0 }}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              animate={{ x: 0 }}
              className={styles.mobileDrawer}
              exit={{ x: "100%" }}
              initial={prefersReducedMotion ? false : { x: "100%" }}
              onClick={(event) => event.stopPropagation()}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.drawerHeader}>
                <span>Maryland Healthcare</span>
                <button aria-label="Close navigation menu" onClick={() => setIsOpen(false)} type="button">
                  <X aria-hidden size={22} />
                </button>
              </div>

              <div className={styles.drawerLinks}>
                {links.map((link) => (
                  <Link
                    className={isActiveLink(link.href) ? styles.activeLink : undefined}
                    href={link.href}
                    key={link.href}
                    onClick={() => setIsOpen(false)}
                    prefetch={false}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className={styles.drawerActions}>
                <a className={styles.emergencyButton} href="tel:+2349074487448">
                  <AlertCircle aria-hidden size={18} />
                  <span>24/7 Emergency</span>
                  <strong>0907 448 7448</strong>
                </a>
                <Link
                  className={styles.bookButton}
                  href="/book"
                  onClick={() => setIsOpen(false)}
                >
                  <CalendarCheck aria-hidden size={16} />
                  <span>Book Appointment</span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
