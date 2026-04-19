import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalLoadingProvider } from "@/components/GlobalLoading";

export const metadata: Metadata = {
  title: "Pilgrimage Admin",
  description: "Admin console for Yatra registrations",
};

// Force dynamic rendering so build-time prerender doesn't break auth-bound layouts.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          <GlobalLoadingProvider>{children}</GlobalLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
