"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../components/Navbar';
import styles from './privacy.module.css';

export default function PrivacyPolicyPage() {
    const router = useRouter();

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.headerRow}>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <h1 className={styles.headerTitle}>Privacy Policy</h1>
                </div>

                <div className={styles.content}>
                    {/* The title is already in the header, so we can hide or omit the redundant title strictly speaking, 
                        but to match "text" content explicitly we will render sections as provided. 
                    */}

                    <div className={styles.section}>
                        <p className={styles.text}>
                            This privacy policy applies to the myaccount.id app (hereby referred to as "Application") for mobile devices that was created by Consolegal Private Limited (hereby referred to as "Service Provider") as a Commercial service. This service is intended for use "AS IS".
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Information Collection and Use</h2>
                        <p className={styles.text}>
                            The Application collects information when you download and use it. This information may include information such as:
                        </p>
                        <div className={styles.bulletPoints}>
                            <span className={styles.bulletPoint}>• Your device's Internet Protocol address (e.g. IP address)</span>
                            <span className={styles.bulletPoint}>• The pages of the Application that you visit, the time and date of your visit, the time spent on those pages</span>
                            <span className={styles.bulletPoint}>• The time spent on the Application</span>
                            <span className={styles.bulletPoint}>• The operating system you use on your mobile device</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <p className={styles.text}>
                            The Application collects your device's location, which helps the Service Provider determine your approximate geographical location and make use of in below ways:
                        </p>
                        <div className={styles.bulletPoints}>
                            <span className={styles.bulletPoint}>• Geolocation Services: The Service Provider utilizes location data to provide features such as personalized content, relevant recommendations, and location-based services.</span>
                            <span className={styles.bulletPoint}>• Analytics and Improvements: Aggregated and anonymized location data helps the Service Provider to analyze user behavior, identify trends, and improve the overall performance and functionality of the Application.</span>
                            <span className={styles.bulletPoint}>• Third-Party Services: Periodically, the Service Provider may transmit anonymized location data to external services. These services assist them in enhancing the Application and optimizing their offerings.</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <p className={styles.text}>
                            The Service Provider may use the information you provided to contact you from time to time to provide you with important information, required notices and marketing promotions.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <p className={styles.text}>
                            For a better experience, while using the Application, the Service Provider may require you to provide us with certain personally identifiable information, including but not limited to Full Name, Email Address, Phone Number, Username/Employee ID, Precise GPS Location, Real-time Location Tracking, Check-in/Check-out Coordinates, Photographs (Selfie for Verification), Attendance History, Shift Timings, Assigned Work Sites, Device Information/IP Address.. The information that the Service Provider request will be retained by them and used as described in this privacy policy.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Third Party Access</h2>
                        <p className={styles.text}>
                            Only aggregated, anonymized data is periodically transmitted to external services to aid the Service Provider in improving the Application and their service. The Service Provider may share your information with third parties in the ways that are described in this privacy statement.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <p className={styles.text}>
                            Please note that the Application utilizes third-party services that have their own Privacy Policy about handling data. Below are the links to the Privacy Policy of the third-party service providers used by the Application:
                        </p>
                        <div className={styles.bulletPoints}>
                            <span className={styles.bulletPoint}>• Google Play Services</span>
                            <span className={styles.bulletPoint}>• Google Analytics for Firebase</span>
                            <span className={styles.bulletPoint}>• Firebase Crashlytics</span>
                            <span className={styles.bulletPoint}>• Expo</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <p className={styles.text}>
                            The Service Provider may disclose User Provided and Automatically Collected Information:
                        </p>
                        <div className={styles.bulletPoints}>
                            <span className={styles.bulletPoint}>• as required by law, such as to comply with a subpoena, or similar legal process;</span>
                            <span className={styles.bulletPoint}>• when they believe in good faith that disclosure is necessary to protect their rights, protect your safety or the safety of others, investigate fraud, or respond to a government request;</span>
                            <span className={styles.bulletPoint}>• with their trusted services providers who work on their behalf, do not have an independent use of the information we disclose to them, and have agreed to adhere to the rules set forth in this privacy statement.</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Use of Artificial Intelligence</h2>
                        <p className={styles.text}>
                            The Application uses Artificial Intelligence (AI) technologies to enhance user experience and provide certain features. The AI components may process user data to deliver personalized content, recommendations, or automated functionalities. All AI processing is performed in accordance with this privacy policy and applicable laws. If you have questions about the AI features or data processing, please contact the Service Provider.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Opt-Out Rights</h2>
                        <p className={styles.text}>
                            You can stop all collection of information by the Application easily by uninstalling it. You may use the standard uninstall processes as may be available as part of your mobile device or via the mobile application marketplace or network.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Data Retention Policy</h2>
                        <p className={styles.text}>
                            The Service Provider will retain User Provided data for as long as you use the Application and for a reasonable time thereafter. If you'd like them to delete User Provided Data that you have provided via the Application, please contact them at support@myaccount.asia and they will respond in a reasonable time.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Children</h2>
                        <p className={styles.text}>
                            The Service Provider does not use the Application to knowingly solicit data from or market to children under the age of 13.
                        </p>
                        <p className={styles.text} style={{ marginTop: '8px' }}>
                            The Application does not address anyone under the age of 13. The Service Provider does not knowingly collect personally identifiable information from children under 13 years of age. In the case the Service Provider discover that a child under 13 has provided personal information, the Service Provider will immediately delete this from their servers. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact the Service Provider (support@myaccount.asia) so that they will be able to take the necessary actions.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Security</h2>
                        <p className={styles.text}>
                            The Service Provider is concerned about safeguarding the confidentiality of your information. The Service Provider provides physical, electronic, and procedural safeguards to protect information the Service Provider processes and maintains.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Changes</h2>
                        <p className={styles.text}>
                            This Privacy Policy may be updated from time to time for any reason. The Service Provider will notify you of any changes to the Privacy Policy by updating this page with the new Privacy Policy. You are advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval of all changes.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <p className={styles.text}>
                            This privacy policy is effective as of 2026-02-14
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Your Consent</h2>
                        <p className={styles.text}>
                            By using the Application, you are consenting to the processing of your information as set forth in this Privacy Policy now and as amended by us.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Contact Us</h2>
                        <p className={styles.text}>
                            If you have any questions regarding privacy while using the Application, or have questions about the practices, please contact the Service Provider via email at support@myaccount.asia.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
