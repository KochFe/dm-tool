import type { Metadata } from "next";
import { Geist, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { NavUser } from "@/components/NavUser";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DM Co-Pilot",
  description: "D&D Dungeon Master Assistant",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("header");

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${cormorant.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
            >
              {t("skipToContent")}
            </a>
            <nav className="border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-50">
              <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
                <Link
                  href="/"
                  className="font-display text-2xl text-primary hover:text-primary/85 transition-colors duration-200 tracking-tight italic"
                >
                  {t("appName")}
                </Link>
                <Link
                  href="/campaigns"
                  prefetch={false}
                  className="relative text-foreground/75 hover:text-primary transition-colors duration-200 text-sm font-medium group"
                >
                  {t("campaigns")}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
                </Link>
                <div className="ml-auto flex items-center gap-4">
                  <ThemeToggle />
                  <LanguageToggle />
                  <NavUser />
                </div>
              </div>
            </nav>
            <main id="main-content" className="flex-1">{children}</main>
            <Toaster position="bottom-right" richColors />
          </AuthProvider>
        </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
