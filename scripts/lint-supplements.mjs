// Takviye kataloğu linti (data/supplement-products.json) — CI'da çalışır,
// hata bulursa BAŞARISIZ olur. Katalog yüzlerce kayda çıktığında elle kontrol
// imkânsız; asıl kapı: her ingredients token'ının sinonim borusundan geçip
// kanonik bileşen üretmesi (kaçak token = kural/sınıf eşleşmez = sessiz boşluk).

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getComponents, buildSynonymLookup, normalizeRuleIngredient } from '../client/src/data/ingredientMatcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const catalog = JSON.parse(readFileSync(join(ROOT, 'data', 'supplement-products.json'), 'utf-8'));
const synonyms = JSON.parse(readFileSync(join(ROOT, 'data', 'ingredient-synonyms.json'), 'utf-8'));
const componentClassesRaw = JSON.parse(readFileSync(join(ROOT, 'data', 'component-classes.json'), 'utf-8')).components || {};
const lookup = buildSynonymLookup(synonyms);

// Sınıf anahtarları motorla aynı borudan normalize edilir
const classued = new Set();
for (const name of Object.keys(componentClassesRaw)) {
  const n = normalizeRuleIngredient(name, lookup);
  if (n) classued.add(n);
}

const errors = [];
const seenIds = new Set();
const seenNames = new Set();
const componentUse = new Map(); // kanonik bileşen → ürün sayısı

for (const [i, p] of (catalog.products || []).entries()) {
  const where = `supplement-products[${i}]${p.name ? ` (${p.name})` : ''}`;

  if (!Number.isInteger(p.id) || p.id < 9000001) {
    errors.push(`${where}: id 9000001+ tam sayı olmalı (${p.id})`);
  } else if (seenIds.has(p.id)) {
    errors.push(`${where}: mükerrer id ${p.id}`);
  } else {
    seenIds.add(p.id);
  }

  for (const field of ['name', 'ingredients', 'category', 'source', 'accessed']) {
    if (!p[field] || String(p[field]).trim() === '') {
      errors.push(`${where}: zorunlu alan eksik: ${field}`);
    }
  }

  const nameKey = (p.name || '').trim().toLocaleUpperCase('tr');
  if (nameKey) {
    if (seenNames.has(nameKey)) errors.push(`${where}: mükerrer ürün adı`);
    seenNames.add(nameKey);
  }

  if (/melatonin/i.test(p.name || '') || /melatonin/i.test(p.ingredients || '')) {
    errors.push(`${where}: melatonin ürünleri katalog DIŞI (TR'de TİTCK ruhsatlı ilaçtır)`);
  }

  // Asıl kapı: her token kanonik bileşen üretmeli; token sayısı = bileşen sayısı
  // (bir token sinonimsiz kalıp elenirse sayı düşer ve burada yakalanır).
  if (p.ingredients) {
    const tokens = p.ingredients.split(',').map((t) => t.trim()).filter(Boolean);
    const comps = getComponents(p.ingredients, lookup);
    if (comps.length !== tokens.length) {
      errors.push(`${where}: ${tokens.length} token'dan ${comps.length} kanonik bileşen çıktı — sinonim kaçağı var: "${p.ingredients}" → [${comps.join(', ')}]`);
    }
    for (const c of comps) componentUse.set(c, (componentUse.get(c) || 0) + 1);
  }
}

console.log(`Takviye kaydı: ${catalog.products?.length || 0} · tekil bileşen: ${componentUse.size}`);
const classless = [...componentUse.entries()].filter(([c]) => !classued.has(c)).sort((a, b) => b[1] - a[1]);
if (classless.length > 0) {
  console.log('Sınıfsız (kuralsız) bileşenler — bilinen ciddi etkileşimi yoksa bilinçli, dürüst "bilinmiyor":');
  for (const [c, n] of classless) console.log(`  ${String(n).padStart(4)}  ${c}`);
}

if (errors.length > 0) {
  console.error(`\n${errors.length} HATA:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('Takviye linti geçti.');
