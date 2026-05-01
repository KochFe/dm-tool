// Fail-fast catalogue parity check. Run via `npm run check-i18n`.
// Usage: node scripts/check-i18n.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../src/i18n/messages");

function flatten(obj, prefix = "") {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const inner of flatten(v, path)) out.add(inner);
    } else {
      out.add(path);
    }
  }
  return out;
}

const en = JSON.parse(readFileSync(`${root}/en.json`, "utf8"));
const de = JSON.parse(readFileSync(`${root}/de.json`, "utf8"));

const enKeys = flatten(en);
const deKeys = flatten(de);

const missingInDe = [...enKeys].filter((k) => !deKeys.has(k));
const missingInEn = [...deKeys].filter((k) => !enKeys.has(k));

if (missingInDe.length || missingInEn.length) {
  console.error("i18n catalogue mismatch:");
  if (missingInDe.length) console.error("  missing in de.json:", missingInDe);
  if (missingInEn.length) console.error("  missing in en.json:", missingInEn);
  process.exit(1);
}
console.log(`i18n catalogues OK (${enKeys.size} keys).`);
