// Reçete tipi verisi linti: data/prescription-products.json (TİTCK resmî
// listelerinden ürün-bazlı) ve data/prescription-manual.json şemasını doğrular.
// Tip değerleri geçerli mi, barkodlar veri setinde var mı, kaynak listeleri
// tarihli mi — raporlar. Ağ gerektirmez (üretilmiş dosyaları okur).

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data');
const VALID = new Set(['kirmizi', 'yesil', 'izleme', 'mor']);

let rx;
try {
  rx = JSON.parse(readFileSync(join(SRC, 'prescription-products.json'), 'utf-8'));
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('prescription-products.json yok — reçete tipi henüz senkron edilmemiş (opsiyonel). Lint atlandı.');
    process.exit(0);
  }
  throw err;
}

const products = rx.products || {};
let errors = 0;
for (const [bc, type] of Object.entries(products)) {
  if (!VALID.has(type)) { console.error(`  HATA: geçersiz tip '${type}' (${bc})`); errors++; }
  if (!/^\d{8,14}$/.test(bc)) { console.error(`  HATA: geçersiz barkod '${bc}'`); errors++; }
}
if (!rx.sources || rx.sources.length === 0) {
  console.error('  HATA: kaynak liste bilgisi (sources) yok');
  errors++;
}

// Elle bağlama dosyası (varsa) — tip geçerliliği
try {
  const manual = JSON.parse(readFileSync(join(SRC, 'prescription-manual.json'), 'utf-8'));
  for (const [bc, type] of Object.entries(manual.barcodes || {})) {
    if (!VALID.has(type)) { console.error(`  HATA: prescription-manual geçersiz tip '${type}' (${bc})`); errors++; }
  }
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

// Barkodlar veri setinde var mı? (kapsam raporu; hata değil)
const drugs = JSON.parse(readFileSync(join(SRC, 'ilaclar-dataset.json'), 'utf-8'))[2].data;
const known = new Set(drugs.map((d) => String(d.barcode || '').trim()));
const orphan = Object.keys(products).filter((bc) => !known.has(bc));

if (errors > 0) {
  console.error(`Reçete linti BAŞARISIZ (${errors} hata).`);
  process.exit(1);
}

const counts = {};
for (const t of Object.values(products)) counts[t] = (counts[t] || 0) + 1;
console.log(`Reçete ürünü: ${Object.keys(products).length}`, counts);
console.log('Kaynak listeler:', rx.sources.map((s) => `${s.type}:${s.date}`).join(', '));
if (orphan.length) console.log(`Not: veri setinde bulunmayan ${orphan.length} barkod (eski liste kaydı olabilir).`);
console.log('Reçete linti geçti.');
