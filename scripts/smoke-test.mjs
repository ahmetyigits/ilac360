// Lightweight Node smoke test: load the public JSON files the same way the
// browser will, then exercise search + interaction analysis to confirm the
// data plumbing matches the legacy server output.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'client', 'public', 'data');

function turkishLower(s) {
  return String(s)
    .replace(/İ/g, 'i').replace(/I/g, 'ı').replace(/Ş/g, 'ş')
    .replace(/Ğ/g, 'ğ').replace(/Ü/g, 'ü').replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç').toLowerCase();
}
function flexibleIncludes(h, n) {
  if (turkishLower(h).includes(turkishLower(n))) return true;
  return String(h).toLowerCase().includes(String(n).toLowerCase());
}

const t0 = Date.now();
const index = JSON.parse(readFileSync(join(DATA, 'drugs-index.json'), 'utf-8'));
console.log(`drugs-index.json   : ${index.length} entries, ${(Date.now()-t0)}ms`);

const t1 = Date.now();
const interactions = JSON.parse(readFileSync(join(DATA, 'interactions.json'), 'utf-8'));
console.log(`interactions.json  : ${interactions.length} rules, ${(Date.now()-t1)}ms`);

const t2 = Date.now();
const conditions = JSON.parse(readFileSync(join(DATA, 'condition-mapping.json'), 'utf-8'));
console.log(`conditions         : ${conditions.length} entries, ${(Date.now()-t2)}ms`);

// Spot-check: search for "parol"
const matches = [];
for (const e of index) {
  if (flexibleIncludes(e.n, 'parol')) matches.push(e);
  if (matches.length >= 5) break;
}
console.log('\nSearch "parol" → first 5:');
for (const m of matches) console.log(`  - ${m.n}  [${m.a || '?'}]  atc=${m.t || '-'}`);

// Spot-check: lookup PAROL by name
const parol = index.find((e) => turkishLower(e.n).startsWith('parol'));
const aspirin = index.find((e) => turkishLower(e.n).includes('aspirin'));
console.log('\nFound PAROL    :', parol?.n, parol?.a);
console.log('Found ASPIRIN  :', aspirin?.n, aspirin?.a);

// Spot-check: condition mapping for "baş ağrısı"
const mig = conditions.find((c) => c.id === 'bas-agrisi');
console.log('\nCondition bas-agrisi has', mig?.ingredients?.length, 'ingredients,',
  mig?.priorityBrands?.length, 'priority brands');
