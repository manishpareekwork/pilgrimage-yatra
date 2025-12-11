import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pilgrimage Admin",
  description: "Admin console for Yatra registrations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-100">{children}</body>
    </html>
  );
}
