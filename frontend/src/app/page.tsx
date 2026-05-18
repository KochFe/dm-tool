"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const t = useTranslations("landing");

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-hearth pointer-events-none" />
      <div aria-hidden className="absolute inset-0 bg-grain pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-center min-h-[78vh] text-center">
          <Stagger className="flex flex-col items-center">
            <StaggerItem>
              <p className="font-display italic text-sm tracking-[0.3em] uppercase text-primary/80 mb-3">
                {t("tagline")}
              </p>
            </StaggerItem>
            <StaggerItem>
              <h1 className="font-display text-7xl md:text-8xl tracking-tight text-foreground mb-6 leading-[0.95]">
                DM <span className="italic text-primary">Co-Pilot</span>
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="max-w-xl text-base md:text-lg text-muted-foreground mb-10">
                {t("subtitle")}
              </p>
            </StaggerItem>
            <StaggerItem>
              {loading ? (
                <div className="h-12" />
              ) : (
                <FadeIn delay={0.05}>
                  <Link
                    href={user ? "/campaigns" : "/login"}
                    prefetch={false}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium tracking-wide shadow-glow-amber hover:scale-[1.03] active:scale-[0.98] transition-transform duration-200"
                  >
                    {user ? t("goToCampaigns") : t("signIn")}
                  </Link>
                </FadeIn>
              )}
            </StaggerItem>
          </Stagger>
        </div>
      </div>
    </div>
  );
}
