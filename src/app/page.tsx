
import React from "react";
import { FaqItem } from "../components/FaqItem";
import Link from "next/link";
import Image from "next/image";
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
          <Link href="#pricing" className={styles.navLink}>Pricing</Link>
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
          <span className={styles.gradientText}>Workforce Management</span>
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

      {/* Trusted By Section */}
      <section className={styles.trustedSection}>
        <p className={styles.trustedTitle}>Trusted by innovative teams</p>
        <div className={styles.logosGrid}>
          <div className={styles.logoItem}>Acme Corp</div>
          <div className={styles.logoItem}>GlobalTech</div>
          <div className={styles.logoItem}>Nebula Inc</div>
          <div className={styles.logoItem}>FluxSystems</div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className={styles.features}>
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
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className={styles.stepsSection}>
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
      </section>



      {/* App Showcase Section */}
      <section className={styles.showcaseSection}>
        <div className={styles.showcaseHeader}>
          <h2 className={styles.sectionTitle}>Experience the Future of Work</h2>
          <p className={styles.showcaseDesc}>
            A beautifully crafted mobile app that your team will actually love to use.
            Everything you need, right in your pocket.
          </p>
        </div>

        <div className={styles.mockupsContainer}>
          <div className={styles.mockupsTrack}>
            <ShowcaseCard
              img="/mockups/group-62.png"
              title="Smart Dashboard"
              desc="Get a bird's-eye view of your daily schedule, active hours, and quick actions."
            />
            <ShowcaseCard
              img="/mockups/group-63.png"
              title="One-Tap Attendance"
              desc="Clock in seamlessly with location verification and device restrictions."
            />
            <ShowcaseCard
              img="/mockups/group-64.png"
              title="Attendance Logs"
              desc="View detailed logs of your entire month with status indicators."
            />
            <ShowcaseCard
              img="/mockups/group-65.png"
              title="Detailed Analytics"
              desc="Track your performance with beautiful charts and visual insights."
            />
            <ShowcaseCard
              img="/mockups/group-66.png"
              title="Leave Management"
              desc="Apply for leaves, view balances, and track approval status."
            />
            <ShowcaseCard
              img="/mockups/group-67.png"
              title="Expense Claims"
              desc="Upload bills and request reimbursements directly from the app."
            />
            <ShowcaseCard
              img="/mockups/group-68.png"
              title="Team Directory"
              desc="Connect with your peers and view team availability."
            />
            <ShowcaseCard
              img="/mockups/group-69.png"
              title="Admin Controls"
              desc="Manage requests and view team presence directly on mobile."
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={styles.faqSection}>
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        <FaqItem question="Can I access this on mobile?" answer="Yes! Attendance Pro is fully responsive and works great on any smartphone or tablet." />
        <FaqItem question="How does the geofencing work?" answer="We use your browser's GPS to verify checking in. Admins can set a permissible radius around the office location." />
        <FaqItem question="Is my data secure?" answer="Absolutely. We use industry-standard encryption and Firebase Authentication to ensure your data is safe." />
        <FaqItem question="Can I export reports?" answer="Yes, admins can export detailed attendance sheets in Excel format with a single click." />
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Ready to transform your workplace?</h2>
        <p className={styles.ctaDesc}>Join thousands of forward-thinking companies managing their teams with Attendance Pro.</p>
        <Link href="/signup" className={styles.ctaBtn}>Start Your Free Trial</Link>
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
          © 2025 Attendance Pro. All rights reserved.
        </div>
      </footer>
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

function ShowcaseCard({ img, title, desc }: { img: string, title: string, desc: string }) {
  return (
    <div className={styles.mockupCard}>
      <div className={styles.mockupImageWrapper}>
        <Image src={img} alt={title} width={280} height={560} className={styles.mockupImage} unoptimized />
      </div>
      <div className={styles.mockupInfo}>
        <h4 className={styles.mockupTitle}>{title}</h4>
        <p className={styles.mockupFeature}>{desc}</p>
      </div>
    </div>
  );
}


