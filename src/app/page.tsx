
import React from "react";
import { FaqItem } from "../components/FaqItem";
import Link from "next/link";
import Image from "next/image";
import Showcase from "../components/Showcase";
import AnimatedTitle from "../components/AnimatedTitle";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Animated Background */}
      <div className={styles.background}>
        <div className={`${styles.blob} ${styles.blob1}`}></div>
        <div className={`${styles.blob} ${styles.blob2}`}></div>
        <div className={`${styles.blob} ${styles.blob3}`}></div>
      </div>

      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <Image src="/myaccount.svg" alt="Attendance Pro" width={180} height={50} priority style={{ objectFit: 'contain' }} />
        </div>
        <div className={styles.navLinks}>
          <Link href="#product" className={styles.navLink}>Product</Link>
          <Link href="#solutions" className={styles.navLink}>Solutions</Link>
          <Link href="#resources" className={styles.navLink}>Resources</Link>
          <Link href="/login" className={styles.loginBtn}>Log In</Link>
          <Link href="#contact" className={styles.outlineBtn}>Talk to Expert</Link>
          <Link href="/signup" className={`${styles.primaryBtn} ${styles.navBtn}`}>Try for Free</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.badge}>✨ V2.0 Now Available</div>
        <h1 className={styles.title}>
          The future of <br />
          <AnimatedTitle />
        </h1>
        <p className={styles.subtitle}>
          The premium attendance management solution for modern teams.
          Track time, manage leaves, and analyze productivity with a stunning interface.
        </p>

        <div className={styles.ctaGroup}>
          <Link href="/signup" className={styles.primaryBtn}>
            Get Started <span>→</span>
          </Link>
          <Link href="/login" className={styles.secondaryBtn}>
            Admin Portal
          </Link>
        </div>
      </header>

      {/* Trusted By Section 
      <section className={styles.trustedSection}>
        <p className={styles.trustedTitle}>Trusted by innovative teams</p>
        <div className={styles.logosGrid}>
          <div className={styles.logoItem}>Acme Corp</div>
          <div className={styles.logoItem}>GlobalTech</div>
          <div className={styles.logoItem}>Nebula Inc</div>
          <div className={styles.logoItem}>FluxSystems</div>
        </div>
      </section>
      */}

      {/* Features Grid */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.featuresInner}>
          <h2 className={styles.sectionTitle}>Everything You Need to Manage Your Team</h2>
          <div className={styles.features}>
            <FeatureCard
              icon="⚡"
              title="Real-time Tracking"
              desc="Live clock-in statuses, active timers, and effective hour calculations for your entire remote or office team."
            />
            <FeatureCard
              icon="📍"
              title="Smart Geofencing"
              desc="Automatically restrict or flag check-ins based on precise GPS office coordinates to ensure compliance."
            />
            <FeatureCard
              icon="📊"
              title="Advanced Analytics"
              desc="Beautiful bar charts and exportable Excel reports to visualize attendance trends and absenteeism."
            />
            <FeatureCard
              icon="🗓️"
              title="Team Calendar"
              desc="A unified view of holidays, approved leaves, and team schedules to better plan your sprints."
            />
            <FeatureCard
              icon="🌓"
              title="Premium UI"
              desc="A specifically crafted dark-mode glassmorphism interface that feels amazing to use every single day."
            />
            <FeatureCard
              icon="🔄"
              title="Regularization"
              desc="Forgot to clock out? Submit correction requests that admins can approve in a single click."
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className={styles.stepsSection}>
        <div className={styles.stepsInner}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>01</div>
              <h3 className={styles.stepTitle}>Create Account</h3>
              <p className={styles.stepDesc}>Sign up your company and invite your team members via email.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>02</div>
              <h3 className={styles.stepTitle}>Set Policies</h3>
              <p className={styles.stepDesc}>Define office locations, shifts, and holiday calendars in settings.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>03</div>
              <h3 className={styles.stepTitle}>Start Tracking</h3>
              <p className={styles.stepDesc}>Employees clock in via mobile or web. You get real-time reports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Help & Support Section */}
      <section id="support" className={styles.supportSection}>
        <div className={styles.supportInner}>
          <h2 className={styles.sectionTitle}>Help & Support</h2>
          <div className={styles.stepsGrid}>
            <div className={styles.supportCard}>
              <div className={styles.supportIcon}>📞</div>
              <h3 className={styles.supportTitle}>Call Us</h3>
              <p className={styles.supportDesc}>+91 8808022200</p>
            </div>
            <div className={styles.supportCard}>
              <div className={styles.supportIcon}>✉️</div>
              <h3 className={styles.supportTitle}>Email Support</h3>
              <p className={styles.supportDesc}>support@myaccount.asia</p>
            </div>
            <div className={styles.supportCard}>
              <div className={styles.supportIcon}>💬</div>
              <h3 className={styles.supportTitle}>Live Chat</h3>
              <p className={styles.supportDesc}>Available 24/7 in-app</p>
            </div>
          </div>
        </div>
      </section>

      <Showcase />


      {/* FAQ Section */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.faqInner}>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <FaqItem question="Can I set up multiple office locations?" answer="Yes, administrators can create specific geofenced locations for different offices to ensure teams clock in only when they arrive at their designated site." />
          <FaqItem question="How does the regularization workflow function?" answer="If an employee misses a clock-out, they can submit a regularization request with their correction. Admins receive a notification and can approve or deny it in a single click." />
          <FaqItem question="What kind of reports can I export?" answer="You can extract full monthly attendance logs, calculate effective working hours, check late timings, and download everything as Excel sheets for payroll processing." />
          <FaqItem question="Is my team's location tracked continuously?" answer="No, we respect employee privacy. Location is only fetched precisely at the moment of 'Clock In' and 'Clock Out' to verify they are within the designated geofenced radius." />
          <FaqItem question="Can employees track leaves and expenses too?" answer="Absolutely! The app comes with complete leave management and expense claim systems baked right into the unified dashboard." />
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <div className={styles.footerLogo}>
              <Image src="/myaccount.svg" alt="Attendance Pro" width={150} height={40} style={{ objectFit: 'contain' }} />
            </div>
            <p className={styles.footerDesc}>
              Making workforce management effortless, beautiful, and intelligent for teams of all sizes.
            </p>
            <div className={styles.socialIcons}>
              <Link href="#" target="_blank"><Image src="https://img.icons8.com/ios/50/facebook-new.png" alt="Facebook" width={32} height={32} unoptimized /></Link>
              <Link href="#" target="_blank"><Image src="https://img.icons8.com/ios/50/twitterx--v1.png" alt="Twitter" width={32} height={32} unoptimized /></Link>
              <Link href="#" target="_blank"><Image src="https://img.icons8.com/ios/50/instagram-new--v1.png" alt="Instagram" width={32} height={32} unoptimized /></Link>
              <Link href="#" target="_blank"><Image src="https://img.icons8.com/ios/50/linkedin.png" alt="LinkedIn" width={32} height={32} unoptimized /></Link>
              <Link href="#" target="_blank"><Image src="https://img.icons8.com/ios/50/whatsapp--v1.png" alt="WhatsApp" width={32} height={32} unoptimized /></Link>
            </div>
          </div>
          <div className={styles.footerCol}>
            <h4>Product</h4>
            <Link href="#features" className={styles.footerLink}>Features</Link>
            <Link href="/login" className={styles.footerLink}>Login</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>Company</h4>
            <Link href="#" className={styles.footerLink}>About</Link>
            <Link href="#" className={styles.footerLink}>Careers</Link>
            <Link href="#contact" className={styles.footerLink}>Contact</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>Legal</h4>
            <Link href="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
            <Link href="/delete-account" className={styles.footerLink}>Delete Account</Link>
            <Link href="#" className={styles.footerLink}>Terms</Link>
          </div>
        </div>

        <div className={styles.copyright}>
          © 2026 Attendance Pro. All rights reserved.
        </div>
      </footer>

      {/* WhatsApp FAB */}
      <Link href="https://wa.me/1234567890" target="_blank" className={styles.whatsappFab}>
        <Image src="https://img.icons8.com/ios/50/whatsapp--v1.png" alt="Chat with us" width={32} height={32} unoptimized />
      </Link>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.iconBox}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDesc}>{desc}</p>
    </div>
  );
}
