import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { NavUser } from "@/components/NavUser";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DM Co-Pilot",
  description: "D&D Dungeon Master Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-gray-950">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100 min-h-screen`}
      >
        <AuthProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-amber-600 focus:text-gray-950 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
          >
            Skip to content
          </a>
          <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
              <Link
                href="/"
                className="text-lg font-bold text-amber-400 hover:text-amber-300 transition-colors duration-150 tracking-wide"
              >
                DM Co-Pilot
              </Link>
              <Link
                href="/campaigns"
                prefetch={false}
                className="text-gray-300 hover:text-amber-400 transition-colors duration-150 text-sm font-medium"
              >
                Campaigns
              </Link>
              <div className="ml-auto">
                <NavUser />
              </div>
            </div>
          </nav>
          <main id="main-content" className="flex-1">{children}</main>
          <Toaster position="bottom-right" theme="dark" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
