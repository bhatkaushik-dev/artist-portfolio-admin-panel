import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portfolio Admin",
  description: "Content administration for the portfolio backend",
  robots: { index: false, follow: false },
};

// Most uploads happen from a phone: paint the browser chrome to match the app.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16161a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--elevated)",
              border: "1px solid var(--border-strong)",
              color: "var(--text)",
            },
          }}
        />
      </body>
    </html>
  );
}
