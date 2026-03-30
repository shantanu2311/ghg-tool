import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GHG Tool — MSME Emissions Inventory",
  description:
    "BRSR-ready greenhouse gas inventory tool for Indian MSMEs. GHG Protocol-compliant, IPCC 2006 emission factors, built for Iron & Steel sector.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-6">
            <Link
              href="/"
              className="text-sm font-semibold text-zinc-900"
            >
              GHG Tool
            </Link>
            <div className="flex items-center gap-5">
              <Link
                href="/wizard"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
              >
                Inventory
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
