export const NEXT_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function setLocaleCookie(locale: "en" | "de") {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${NEXT_LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}
