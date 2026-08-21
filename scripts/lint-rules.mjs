// Kural seti linti — CI'da çalışır ve hata bulursa BAŞARISIZ olur.
// Kontroller: zorunlu alanlar, normalize sonrası mükerrer çiftler,
// sınıf kurallarının kategori referans tutarlılığı.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizeRuleIngredient, buildSynonymLookup } from '../client/src/data/ingredientMatcher.js';
import { ATC_CATEGORY_MAP, CATEGORY_INTERACTIONS } from '../client/src/data/categoryRules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const rules = JSON.parse(readFileSync(join(ROOT, 'data', 'interactions.json'), 'utf-8'));
const synonyms = JSON.parse(readFileSync(join(ROOT, 'data', 'ingredient-synonyms.json'), 'utf-8'));
const lookup = buildSynonymLookup(synonyms);

// component-classes.json: SNRI gibi ATC'den türetilmeyen sınıflar + QT etiketleri
let componentClasses = { components: {} };
try {
  componentClasses = JSON.parse(readFileSync(join(ROOT, 'data', 'component-classes.json'), 'utf-8'));
} catch {
  // dosya yoksa boş kabul
}

const VALID_RISKS = new Set(['critical', 'high', 'medium', 'low']);
const errors = [];
const warnings = [];

// --- Çift kuralları ---
const seenPairs = new Map();
const seenIds = new Set();
rules.forEach((rule, i) => {
  const where = `interactions.json[${i}]`;
  if (!rule.id || !/^R-\d{4}$/.test(rule.id)) {
    errors.push(`${where}: geçerli id yok (R-0000 biçimi)`);
  } else if (seenIds.has(rule.id)) {
    errors.push(`${where}: mükerrer id ${rule.id}`);
  } else {
    seenIds.add(rule.id);
  }
  if (rule.evidence && !['label', 'guideline', 'review', 'expert'].includes(rule.evidence)) {
    errors.push(`${where}: geçersiz evidence '${rule.evidence}'`);
  }
  for (const field of ['ingredientA', 'ingredientB', 'risk', 'message', 'source']) {
    if (!rule[field] || String(rule[field]).trim() === '') {
      errors.push(`${where}: zorunlu alan eksik: ${field}`);
    }
  }
  if (rule.risk && !VALID_RISKS.has(rule.risk)) {
    errors.push(`${where}: geçersiz risk '${rule.risk}' (critical|high|medium|low)`);
  }
  if (rule.message && rule.message.length < 20) {
    errors.push(`${where}: mesaj çok kısa (<20 karakter)`);
  }
  // Mekanizma zorunlu (2026-08 zenginleştirme sonrası kapı): details "neyi
  // hangi yolla artırıp azaltıyor" sorusuna cevap veren metindir.
  if (!rule.details || rule.details.trim().length < 30) {
    errors.push(`${where}: details (mekanizma) eksik veya çok kısa (<30 karakter)`);
  }

  const a = normalizeRuleIngredient(rule.ingredientA, lookup);
  const b = normalizeRuleIngredient(rule.ingredientB, lookup);
  if (!a || !b) {
    errors.push(`${where}: taraf normalize edilemedi (${rule.ingredientA} / ${rule.ingredientB})`);
    return;
  }
  // Aynı-madde kuralı (parasetamol×parasetamol) bilinçli olarak serbesttir.
  const key = [a, b].sort().join(' | ');
  if (seenPairs.has(key)) {
    errors.push(`${where}: mükerrer çift (normalize sonrası) — ilk görüldüğü yer: interactions.json[${seenPairs.get(key)}] (${key})`);
  } else {
    seenPairs.set(key, i);
  }
});

// --- component-classes.json doğrulaması ---
const classTagCategories = new Set();
for (const [name, meta] of Object.entries(componentClasses.components || {})) {
  if (!meta.source || String(meta.source).trim() === '') {
    errors.push(`component-classes.json['${name}']: source alanı zorunludur (FDA/EMA etiketi vb.)`);
  }
  if (meta.qt && !['known', 'possible'].includes(meta.qt)) {
    errors.push(`component-classes.json['${name}']: geçersiz qt '${meta.qt}' (known|possible)`);
  }
  for (const cls of meta.classes || []) classTagCategories.add(cls);
}

// --- Sınıf kuralları ---
const mappedCategories = new Set([
  ...ATC_CATEGORY_MAP.map((e) => e.category),
  ...classTagCategories,
]);
const referencedCategories = new Set();
const seenClassPairs = new Map();
CATEGORY_INTERACTIONS.forEach((rule, i) => {
  const where = `CATEGORY_INTERACTIONS[${i}]`;
  for (const field of ['catA', 'catB', 'risk', 'message']) {
    if (!rule[field]) errors.push(`${where}: zorunlu alan eksik: ${field}`);
  }
  for (const side of [rule.catA, rule.catB]) {
    if (side) {
      referencedCategories.add(side);
      if (!mappedCategories.has(side)) {
        errors.push(`${where}: '${side}' kategorisi ATC_CATEGORY_MAP'te tanımlı değil`);
      }
    }
  }
  const key = [rule.catA, rule.catB].sort().join(' | ');
  if (seenClassPairs.has(key)) {
    errors.push(`${where}: mükerrer sınıf çifti — ilk: CATEGORY_INTERACTIONS[${seenClassPairs.get(key)}] (${key})`);
  } else {
    seenClassPairs.set(key, i);
  }
});

// Hiçbir kuralda geçmeyen (ölü) kategoriler — hata değil, uyarı
for (const cat of mappedCategories) {
  if (!referencedCategories.has(cat)) warnings.push(`ölü kategori (hiçbir sınıf kuralında geçmiyor): ${cat}`);
}

console.log(`Çift kuralı: ${rules.length} · Sınıf kuralı: ${CATEGORY_INTERACTIONS.length} · Kategori: ${mappedCategories.size}`);
for (const w of warnings) console.warn(`UYARI: ${w}`);
if (errors.length > 0) {
  console.error(`\n${errors.length} HATA:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`Kural linti geçti (${warnings.length} uyarı).`);
