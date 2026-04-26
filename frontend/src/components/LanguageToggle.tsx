"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";

const NEXT_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function setCookie(value: "en" | "de") {
  document.cookie =
    `NEXT_LOCALE=${value}; path=/; max-age=${NEXT_LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function LanguageToggle() {
  const locale = useLocale() as "en" | "de";
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (pathname.startsWith("/login")) return null;

  async function switchTo(next: "en" | "de") {
    if (next === locale || isPending) return;
    const previous = locale;
    setCookie(next);
    startTransition(() => router.refresh());
    try {
      await api.updateMe({ language: next });
    } catch {
      setCookie(previous);
      router.refresh();
      toast.error("Could not save language preference. Reverted.");
    }
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-md border border-border bg-card text-xs"
    >
      {(["en", "de"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          aria-pressed={locale === code}
          className={
            "px-2 py-1 uppercase tracking-wide transition-colors " +
            (locale === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
          disabled={isPending}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
