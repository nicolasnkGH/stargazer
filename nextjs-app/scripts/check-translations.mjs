#!/usr/bin/env node
/**
 * check-translations.mjs
 *
 * Audits that pt.json and es.json are in sync with en.json (the canonical source).
 * Run manually:   node scripts/check-translations.mjs
 * Run in CI:      npm run check:i18n
 * Run as hook:    added to .husky/pre-commit automatically
 *
 * Exit codes:
 *   0 — all locales are in sync
 *   1 — one or more locales are missing keys (or have orphan keys)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MESSAGES_DIR = path.join(__dirname, "../messages");
const LOCALES = ["en", "pt", "es"];
const SOURCE_LOCALE = "en";

// ── Load all message files ──────────────────────────────────────────────────
const messages = {};
for (const locale of LOCALES) {
  const file = path.join(MESSAGES_DIR, `${locale}.json`);
  if (!fs.existsSync(file)) {
    console.error(`❌  Missing messages file: ${locale}.json`);
    process.exit(1);
  }
  messages[locale] = JSON.parse(fs.readFileSync(file, "utf-8"));
}

const sourceKeys = new Set(Object.keys(messages[SOURCE_LOCALE]));

let failed = false;

// ── For each non-source locale, diff against en.json ───────────────────────
for (const locale of LOCALES.filter((l) => l !== SOURCE_LOCALE)) {
  const localeKeys = new Set(Object.keys(messages[locale]));

  const missing = [...sourceKeys].filter((k) => !localeKeys.has(k));
  const orphan = [...localeKeys].filter((k) => !sourceKeys.has(k));

  if (missing.length === 0 && orphan.length === 0) {
    console.log(`✅  ${locale}.json — ${localeKeys.size} keys, all in sync`);
    continue;
  }

  failed = true;

  if (missing.length > 0) {
    console.error(`\n❌  ${locale}.json — ${missing.length} MISSING key(s):`);
    for (const k of missing) {
      console.error(`     - ${k}   [en]: "${String(messages[SOURCE_LOCALE][k]).slice(0, 60)}"`);
    }
  }

  if (orphan.length > 0) {
    console.warn(`\n⚠️   ${locale}.json — ${orphan.length} ORPHAN key(s) (not in en.json):`);
    for (const k of orphan) {
      console.warn(`     + ${k}`);
    }
  }
}

console.log(`\n${SOURCE_LOCALE}.json — ${sourceKeys.size} total keys (source of truth)`);

if (failed) {
  console.error(
    "\n💥  Translation audit FAILED. Add missing keys to the locale files before committing.\n"
  );
  process.exit(1);
} else {
  console.log("\n🌍  Translation audit passed — all locales are in sync.\n");
}
