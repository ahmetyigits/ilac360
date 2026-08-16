// TİTCK KT metinlerini veri katmanına işler — titck-sync.mjs çıktısından.
//
//   node scripts/titck-merge-desc.mjs --cache <dizin>          → rapor (yazmaz)
//   node scripts/titck-merge-desc.mjs --cache <dizin> --apply  → data/ dosyalarını yaz
//
// TASARIM: metinler ilaclar-dataset.json'a KOPYALANMAZ (8.955 ürün × ~20 KB
// kopya, LFS'i ~200 MB şişirirdi). Bunun yerine:
//   - data/titck-kt-texts.json  : pdfAnahtarı → temizlenmiş KT metni (TEKİL, LFS)
//   - data/titck-kt-map.json    : barkod/ad anahtarı → pdfAnahtarı (küçük, düz git)
// build-data.mjs, kendi Description'ı olmayan ürünlere bu metinleri build
// sırasında bağlar. Veri seti yenilenince (ingest) eşleme barkod üzerinden
// geçerli kalır (ID'ler exportlar arası değişebilir; barkod değişmez).

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { searchFold } from '../client/src/data/turkishText.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const cacheIdx = args.indexOf('--cache');
const CACHE = cacheIdx >= 0 ? args[cacheIdx + 1] : null;
const apply = args.includes('--apply');
if (!CACHE) {
  console.error('Kullanım: node scripts/titck-merge-desc.mjs --cache <dizin> [--apply]');
  process.exit(1);
}
const TXT_DIR = join(CACHE, 'txt');
const MATCH_PATH = join(CACHE, 'matches.json');
if (!existsSync(MATCH_PATH)) {
  console.error('matches.json yok — önce titck-sync.mjs --list çalıştırın.');
  process.exit(1);
}

// Gs txtwrite çıktısı temizliği: satır başı girintileri, sayfa numarası
// satırları ve aşırı boş satırlar atılır. Satır yapısı KORUNUR — DrugCard'ın
// alt başlık ayrıştırıcısı (descriptionFormat.js) satır bazında çalışır.
export function cleanKtText(raw) {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^\d+\s*(\/\s*\d+)?$/.test(t)) continue; // sayfa numarası satırı
    out.push(t);
  }
  return out.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const keyOf = (d) => d.barcode && String(d.barcode).trim()
  ? `b:${String(d.barcode).trim()}`
  : `n:${searchFold(d.Product_Name || '')}`;

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href.replace(/%20/g, ' ');
if (isMain) {
  const matches = JSON.parse(readFileSync(MATCH_PATH, 'utf-8'));
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'ilaclar-dataset.json'), 'utf-8'));
  const drugs = raw[2].data;
  const byId = new Map(drugs.map((d) => [String(d.ID), d]));

  const texts = {};   // pdfKey → metin
  const map = {};     // ürün anahtarı → pdfKey
  let matchedWithText = 0, missingText = 0, tooShort = 0;
  let totalBytes = 0;

  const availableTxt = new Set(existsSync(TXT_DIR) ? readdirSync(TXT_DIR) : []);

  for (const m of matches) {
    const pdfKey = m.ktPdf.split('/').pop().replace(/\.pdf$/i, '');
    const txtName = `${pdfKey}.txt`;
    if (!availableTxt.has(txtName)) { missingText++; continue; }
    if (!(pdfKey in texts)) {
      const cleaned = cleanKtText(readFileSync(join(TXT_DIR, txtName), 'utf-8'));
      if (cleaned.length < 1000 || !/kullanma\s+tal/i.test(cleaned.slice(0, 2000))) {
        tooShort++;
        continue;
      }
      texts[pdfKey] = cleaned;
      totalBytes += Buffer.byteLength(cleaned);
    }
    const drug = byId.get(m.id);
    if (!drug) continue;
    map[keyOf(drug)] = pdfKey;
    matchedWithText++;
  }

  console.log('=== TİTCK KT MERGE RAPORU ===');
  console.log(`Eşleşme kaydı                : ${matches.length}`);
  console.log(`Metni hazır ürün             : ${matchedWithText}`);
  console.log(`Metni henüz inmemiş          : ${missingText}`);
  console.log(`Elenen bozuk/kısa metin      : ${tooShort}`);
  console.log(`Tekil KT metni               : ${Object.keys(texts).length}`);
  console.log(`Toplam metin boyutu          : ${(totalBytes / 1024 / 1024).toFixed(1)} MB (tekilleştirilmiş)`);

  if (!apply) {
    console.log('\nYazmak için --apply ile yeniden çalıştırın.');
    process.exit(0);
  }
  writeFileSync(join(ROOT, 'data', 'titck-kt-texts.json'), JSON.stringify(texts));
  writeFileSync(join(ROOT, 'data', 'titck-kt-map.json'), JSON.stringify(map));
  console.log('\nYazıldı: data/titck-kt-texts.json + data/titck-kt-map.json');
  console.log('Şimdi: npm run build:data && npm run smoke-test');
}
