// Tekil ilaç uyarı seti linti (data/drug-warnings.json) — CI'da çalışır ve
// hata bulursa BAŞARISIZ olur. Kontroller: id biçimi/benzersizliği, enum
// alanları, zorunlu alanlar, eşleşme tarafının normalize edilebilirliği,
// ATC prefix biçimi.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizeRuleIngredient, buildSynonymLookup } from '../client/src/data/ingredientMatcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const warningsData = JSON.parse(readFileSync(join(ROOT, 'data', 'drug-warnings.json'), 'utf-8'));
const synonyms = JSON.parse(readFileSync(join(ROOT, 'data', 'ingredient-synonyms.json'), 'utf-8'));
const lookup = buildSynonymLookup(synonyms);

const VALID_TYPES = new Set(['allergy', 'food', 'supplement', 'pregnancy', 'driving', 'age', 'general']);
const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'info']);
const VALID_EVIDENCE = new Set(['label', 'guideline', 'review', 'expert']);
// A (harf) + 2 rakam + 1-2 harf + opsiyonel 2 rakam — 1..7 karakter arası kesimler
const ATC_PREFIX_RE = /^[A-Z](\d{2}([A-Z]{1,2}(\d{2})?)?)?$/;

const errors = [];
const seenIds = new Set();

warningsData.forEach((w, i) => {
  const where = `drug-warnings.json[${i}]${w.id ? ` (${w.id})` : ''}`;

  if (!w.id || !/^W-\d{4}$/.test(w.id)) {
    errors.push(`${where}: geçerli id yok (W-0000 biçimi)`);
  } else if (seenIds.has(w.id)) {
    errors.push(`${where}: mükerrer id ${w.id}`);
  } else {
    seenIds.add(w.id);
  }

  if (!VALID_TYPES.has(w.type)) {
    errors.push(`${where}: geçersiz type '${w.type}' (allergy|food|supplement|pregnancy|driving|age|general)`);
  }
  if (!VALID_SEVERITIES.has(w.severity)) {
    errors.push(`${where}: geçersiz severity '${w.severity}' (critical|high|medium|info)`);
  }
  if (!VALID_EVIDENCE.has(w.evidence)) {
    errors.push(`${where}: geçersiz evidence '${w.evidence}' (label|guideline|review|expert)`);
  }
  if (typeof w.systemicOnly !== 'boolean') {
    errors.push(`${where}: systemicOnly zorunludur ve boolean olmalıdır`);
  }
  for (const field of ['title', 'message', 'source']) {
    if (!w[field] || String(w[field]).trim() === '') {
      errors.push(`${where}: zorunlu alan eksik: ${field}`);
    }
  }
  if (w.message && w.message.length < 20) {
    errors.push(`${where}: mesaj çok kısa (<20 karakter)`);
  }

  const prefixes = w.match?.atcPrefixes || [];
  const ingredients = w.match?.ingredients || [];
  if (prefixes.length === 0 && ingredients.length === 0) {
    errors.push(`${where}: match.atcPrefixes veya match.ingredients'ten en az biri gerekli`);
  }
  for (const p of prefixes) {
    if (!ATC_PREFIX_RE.test(p)) {
      errors.push(`${where}: geçersiz ATC prefix '${p}'`);
    }
  }
  for (const ing of ingredients) {
    if (!normalizeRuleIngredient(ing, lookup)) {
      errors.push(`${where}: etken madde normalize edilemedi: '${ing}'`);
    }
  }
});

const byType = new Map();
for (const w of warningsData) byType.set(w.type, (byType.get(w.type) || 0) + 1);
console.log(
  `Uyarı kaydı: ${warningsData.length} · ` +
  [...byType.entries()].map(([t, c]) => `${t}: ${c}`).join(' · ')
);

if (errors.length > 0) {
  console.error(`\n${errors.length} HATA:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('Uyarı linti geçti.');
