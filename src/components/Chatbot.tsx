"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export default function Chatbot() {
  const pathname = usePathname();

  // Define which paths are considered "landing pages"
  // Usually the homepage, and other public-facing pages.
  const isLandingPage = 
    pathname === "/" || 
    pathname === "/login" || 
    pathname === "/signup" || 
    pathname === "/forgot-password" || 
    pathname.startsWith("/privacy") || 
    pathname.startsWith("/terms");

  // If you want it everywhere, just return the Script tag without conditions
  if (!isLandingPage) return null;

  return (
    <Script
      src="https://crm.consolegal.com/chatbot.js"
      strategy="afterInteractive"
      defer
    />
  );
}
