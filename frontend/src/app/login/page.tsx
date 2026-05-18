"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { FadeIn } from "@/components/motion";

export default function LoginPage() {
  const { login } = useAuth();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Map backend "Invalid credentials" to catalogue key; fall back for everything else
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials") || msg.toLowerCase().includes("401")) {
        setError(t("invalidCredentials"));
      } else {
        setError(t("loginFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-65px)]">
      <div aria-hidden className="absolute inset-0 bg-hearth pointer-events-none" />
      <div aria-hidden className="absolute inset-0 bg-grain pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 py-6">
    <div className="flex items-center justify-center min-h-[80vh]">
      <FadeIn y={20} duration={0.6} className="w-full max-w-sm">
        <p className="font-display italic text-primary/80 tracking-[0.3em] text-xs uppercase text-center mb-3">
          A Dungeon Master&apos;s Codex
        </p>
        <h1 className="font-display text-4xl text-foreground text-center mb-8">
          {t("loginTitle")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/40 border border-red-800/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm text-muted-foreground mb-1"
            >
              {t("emailLabel")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-ring"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm text-muted-foreground mb-1"
            >
              {t("passwordLabel")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-ring"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold rounded-lg transition-colors"
          >
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground/60 mt-6">
          <Link href="/" className="hover:text-muted-foreground transition-colors">
            {t("backToHome")}
          </Link>
        </p>
      </FadeIn>
    </div>
    </div>
    </div>
  );
}
