import React from "react";
// import { FaqItem } from "../components/FaqItem";
import Showcase from "../components/Showcase";
import HeroRightSlider from "../components/HeroRightSlider";
// import AnimatedTitle from "../components/AnimatedTitle";
import Link from "next/link";
import Image from "next/image";
import { Poppins } from "next/font/google";
import RequestCallModal from "../components/RequestCallModal";
import styles from "./page.module.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function MyAccountLandingPage() {
  return (
    <div className={`${styles.container} ${poppins.className}`}>
      {/* Header / Nav */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLogo}>
            <Image src="/myaccount.svg" alt="MyAccount Logo" width={180} height={40} priority style={{ objectFit: 'contain' }} />
          </div>
          <div className={styles.headerRight}>
            <div className={styles.supportContact}>
              <RequestCallModal />
            </div>
            {/* <div className={styles.supportContact}>
              <span className={styles.supportContactTitle}>Email Support</span>
              <a href="mailto:support@myaccount.asia" className={styles.supportContactValue}>support@myaccount.asia</a>
            </div> */}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <h1 className={styles.heroTitle}>
              Welcome to MyAccount
            </h1>
            <p className={styles.heroSubtitle}>
              A free public utility platform built for Startups, MSMEs & Women Founders.
              Manage your Sales (SMT), Attendance & Billing — all in one compliance-ready system.
            </p>
            <div className={styles.heroButtons}>
              <Link href="/login" className={styles.primaryBtn}>
                Login
              </Link>
              <Link href="/register" className={styles.outlineBtn}>
                Get Started Free
              </Link>
            </div>
          </div>
          <HeroRightSlider />
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresInner}>
          <h2 className={styles.sectionTitle}>Core Free Modules</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureNumber}>1</div>
              <h3 className={styles.featureTitle}>SMT (Sales Management Tool)</h3>
              <p className={styles.featureDesc}>
                Manage leads, track follow-ups, convert prospects, and organize customer data efficiently.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureNumber}>2</div>
              <h3 className={styles.featureTitle}>Attendance Management</h3>
              <p className={styles.featureDesc}>
                Track employee attendance, monitor working hours, and maintain workforce discipline digitally.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureNumber}>3</div>
              <h3 className={styles.featureTitle}>Billing & Invoicing</h3>
              <p className={styles.featureDesc}>
                Generate professional invoices, manage payments, and maintain billing records effortlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* App Showcase Section */}
      <Showcase />

      {/* FAQ Section */}
      <section className={styles.faqSection}>
        <div className={styles.faqInner}>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqGrid}>
            <div className={styles.faqCard}>
              <h3 className={styles.faqCardTitle}>Is MyAccount completely free?</h3>
              <p className={styles.faqCardDesc}>Yes. Core modules including SMT, Attendance and Billing are provided free as a public utility platform.</p>
            </div>

            <div className={styles.faqCard}>
              <h3 className={styles.faqCardTitle}>Who can use MyAccount?</h3>
              <p className={styles.faqCardDesc}>Startups, MSMEs, professionals, agencies, and women entrepreneurs across India can use MyAccount.</p>
            </div>

            <div className={styles.faqCard}>
              <h3 className={styles.faqCardTitle}>Is my data secure?</h3>
              <p className={styles.faqCardDesc}>Yes. The platform is cloud-based with secure access controls to protect your business data.</p>
            </div>

            <div className={styles.faqCard}>
              <h3 className={styles.faqCardTitle}>Will premium features be added?</h3>
              <p className={styles.faqCardDesc}>Advanced modules and integrations may be introduced in the future while keeping essential tools free.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Support & Grievance Section */}
      <section className={styles.supportSection}>
        <div className={styles.supportInner}>
          <h2 className={styles.sectionTitle}>Support & Grievance Redressal</h2>
          <p className={styles.supportDesc}>
            We follow a structured ticket-based resolution system to ensure every query and grievance is addressed transparently and efficiently.
          </p>
          <div className={styles.supportGrid}>
            <div className={styles.supportCard}>
              <div className={styles.supportIcon}>
                <Image src="/support-icons/confirmation_number_40dp_1F1F1F_FILL0_wght200_GRAD0_opsz40.svg" alt="Ticket" width={32} height={32} />
              </div>
              <h3 className={styles.supportCardTitle}>Raise a Ticket</h3>
              <p className={styles.supportCardDesc}>Submit your issue through the dashboard support system.</p>
            </div>

            <div className={styles.supportCard}>
              <div className={styles.supportIcon}>
                <Image src="/support-icons/view_timeline_40dp_1F1F1F_FILL0_wght200_GRAD0_opsz40.svg" alt="Timeline" width={32} height={32} />
              </div>
              <h3 className={styles.supportCardTitle}>Track Resolution</h3>
              <p className={styles.supportCardDesc}>Monitor status updates and communication within your ticket.</p>
            </div>

            <div className={styles.supportCard}>
              <div className={styles.supportIcon}>
                <Image src="/support-icons/more_time_40dp_1F1F1F_FILL0_wght200_GRAD0_opsz40.svg" alt="Time Bound" width={32} height={32} />
              </div>
              <h3 className={styles.supportCardTitle}>Time-Bound Closure</h3>
              <p className={styles.supportCardDesc}>We aim for structured and timely resolution of all concerns.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Escalation Section */}
      <section className={styles.escalationSection}>
        <div className={styles.escalationInner}>
          <div className={styles.escalationContent}>
            <h3 className={styles.escalationTitle}>Escalation & Feedback Support</h3>
            <p className={styles.escalationDesc}>
              In case your support ticket remains unresolved beyond the committed resolution timeline, or if you wish to share suggestions or service feedback, you may escalate the matter by writing to
              <a href="mailto:support@myaccount.asia" className={styles.supportMail}>
                {" "}support@myaccount.asia
              </a>.
            </p>
            <p className={styles.escalationDesc}>
              Please mention your Ticket ID (if available) for faster assistance. All escalations are reviewed by our supervisory team to ensure timely and transparent resolution.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>© {new Date().getFullYear()} MyAccount. All rights reserved.</p>
        <div className={styles.poweredBy}>
          Powered by
          <div className={styles.pillLogo}>
            <Image src="/consolegal.jpeg" unoptimized alt="ConsoLegal" width={120} height={36} style={{ objectFit: 'contain', borderRadius: '9999px' }} />
          </div>
        </div>
      </footer>
    </div>
  );
}
