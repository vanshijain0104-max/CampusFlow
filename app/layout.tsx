/**
 * CampusFlow — Root Layout
 * app/layout.tsx
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CampusFlow · Banasthali Vidyapith",
    template: "%s · CampusFlow",
  },
  description:
    "CampusFlow — Banasthali Vidyapith Student Leave Application Portal & Hostel Management System.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/banasthali-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/banasthali-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-[#F0F4F8]">{children}</body>
    </html>
  );
}
