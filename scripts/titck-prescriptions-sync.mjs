// Resmî TİTCK renkli reçete listelerini çekip ÜRÜN bazında reçete tipini üretir
// → data/prescription-products.json ({ generatedAt, sources[], products{barkod:tip} }).
//
// NEDEN ürün-bazlı: TİTCK listeleri ticari ad + ambalaj bazında yayımlanır ve
// düzenli güncellenir; kombinasyonlar/düşük-doz muafiyetleri MOLEKÜLDEN çıkmaz
// (ör. gabapentin yeşil değil "izlemeye tabi"; parasetamol+kodein kombosu izleme).
//
// Kaynak: titck.gov.tr/faaliyetalanlari/ilac/uyusturucu-ve-psikotrop-maddeler
//   - Kırmızı Reçeteye Tabi İlaçlar Listesi (PDF: İLAÇ ADI + ATC ADI, barkodsuz)
//   - Yeşil Reçeteli İlaçlar Listesi (PDF: İLAÇ ADI + ATC ADI, barkodsuz)
//   - Normal Reçete ile Verilmesi Gereken İzlemeye Tabi İlaçlar (XLSX: BARKOD+AD+MADDE)
// Barkodsuz PDF'ler matchKey (titck-sync) fuzzy adıyla veri setine bağlanır.
//
// Ağ/CSRF'e bağımlı; erişilemezse mevcut prescription-products.json korunur.
// Öncelik (çok listede ise): kırmızı > yeşil > mor > izleme.

import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { matchKey } from './titck-sync.mjs';
import { searchFold } from '../client/src/data/turkishText.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(ROOT, 'data', 'prescription-products.json');
const RESIDUAL_PATH = join(ROOT, 'data', 'prescription-residuals.json');

// Barkodsuz PDF adları için ikincil eşleşme: MARKA + DOZ. TİTCK adı ile veri
// seti adı arasındaki form/ambalaj/yazım farklarına ("DUROGESIC 100 MCG 5 TTS
// FLASTER" ↔ "DUROGESIC 100 MCG/SAAT 5 TRANSDERMAL FLASTER") dayanıklıdır.
const asciiFold = (s) => s.replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
function brandDose(name) {
  if (!name) return null;
  const r = asciiFold(searchFold(name))
    .replace(/(\d)[.,](?=\d{3}\b)/g, '$1')  // binlik ayraç
    .replace(/(\d),(\d)/g, '$1.$2');        // ondalık virgül
  let brand = (r.match(/^[^0-9]+/)?.[0] || r).trim().replace(/\s+/g, ' ');
  brand = brand.replace(/\b(film|kapli|uzatilmis|kontrollu|kont|salimli|salim|efervesan|oral|iv|im)\b/g, '').replace(/\s+/g, ' ').trim();
  const st = [...r.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|gr|g|iu|ie|ug)\b/g)].map((m) => `${m[1]}${m[2] === 'gr' ? 'g' : m[2]}`);
  if (!brand || st.length === 0) return null;
  return `${brand}|${[...new Set(st)].sort().join(',')}`;
}
// Adın markası (ilk alfabetik blok) — residual'de "markası veri setinde var mı" kontrolü.
const brandOf = (name) => (asciiFold(searchFold(name || '')).match(/^[a-z][a-z-]+/)?.[0] || '');
const PAGE = 'https://www.titck.gov.tr/faaliyetalanlari/ilac/uyusturucu-ve-psikotrop-maddeler';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ilac360-arastirma';
const PRIORITY = { kirmizi: 0, yesil: 1, mor: 2, izleme: 3 };

async function get(url, asBuffer = false) {
  const res = await fetch(encodeURI(url), { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return asBuffer ? Buffer.from(await res.arrayBuffer()) : res.text();
}

// Sayfadan hedef listelerin en güncel doküman URL'sini + tarihini bul.
function findListDocs(html) {
  const hrefs = [...html.matchAll(/href="([^"]+\.(?:pdf|xlsx))"/gi)].map((m) => m[1]);
  const pick = (patterns, ext) => {
    const cands = hrefs.filter((h) => ext.test(h) && patterns.every((p) => new RegExp(p, 'i').test(h)));
    return cands[0] || null; // sayfa en güncelini en üstte listeler
  };
  const dateOf = (url) => {
    const f = decodeURIComponent(url.split('/').pop() || '');
    const m = f.match(/\b(\d{2})[.\-]?(\d{2})[.\-]?(20\d{2})\b/);
    if (m && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}.${m[2]}.${m[3]}`;
    return url.match(/Archive\/(\d{4})/)?.[1] || 'bilinmiyor'; // tarih yoksa arşiv yılı
  };
  return {
    kirmizi: (() => { const u = pick(['K.rm.z.', 'Re.ete'], /\.pdf$/i); return u && { type: 'kirmizi', url: u, date: dateOf(u) }; })(),
    yesil: (() => { const u = pick(['Ye.il', 'Re.ete'], /\.pdf$/i); return u && { type: 'yesil', url: u, date: dateOf(u) }; })(),
    izleme: (() => { const u = pick(['zlemeye', 'Tabi'], /\.xlsx$/i); return u && { type: 'izleme', url: u, date: dateOf(u) }; })(),
  };
}

// PDF (kırmızı/yeşil): gs ile metne çevir, her satırdan ÜRÜN ADINI (ilk sütun) al.
function parsePdfNames(buf) {
  const dir = mkdtempSync(join(tmpdir(), 'rxpdf-'));
  const pdf = join(dir, 'l.pdf'); const txt = join(dir, 'l.txt');
  writeFileSync(pdf, buf);
  execFileSync('gs', ['-q', '-dNOPAUSE', '-dBATCH', '-sDEVICE=txtwrite', `-sOutputFile=${txt}`, pdf]);
  const names = [];
  for (const raw of readFileSync(txt, 'utf-8').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    // Sütunlar 2+ boşlukla ayrık; ilk alan ürün adı. Ürün satırı: harf + rakam içerir.
    const cols = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const name = cols[0];
    if (name.length < 6) continue;
    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(name) || !/\d/.test(name)) continue; // ad + doz/ambalaj
    if (/REÇETE|LİSTE|İLAÇ ADI|ATC|MAKSİMAL|AÇIKLAMA/i.test(name)) continue; // başlık
    names.push(name);
  }
  return names;
}

// XLSX (izleme): unzip -p ile sharedStrings + sheet1 XML → satırlar [BARKOD, AD, MADDE].
function parseXlsx(buf) {
  const dir = mkdtempSync(join(tmpdir(), 'rxxls-'));
  const xlsx = join(dir, 'l.xlsx');
  writeFileSync(xlsx, buf);
  const ss = [...execFileSync('unzip', ['-p', xlsx, 'xl/sharedStrings.xml']).toString('utf-8')
    .matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  const sheet = execFileSync('unzip', ['-p', xlsx, 'xl/worksheets/sheet1.xml']).toString('utf-8');
  const rows = [];
  for (const rowXml of sheet.split(/<row/).slice(1)) {
    const cells = {};
    for (const c of rowXml.matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(?:<v>([\s\S]*?)<\/v>)?/g)) {
      const col = c[1]; const isStr = /t="s"/.test(c[2]); const v = c[3];
      if (v == null) continue;
      cells[col] = isStr ? (ss[Number(v)] ?? '') : v;
    }
    rows.push(cells);
  }
  return rows;
}

async function main() {
  const html = await get(PAGE);
  const docs = findListDocs(html);
  const sources = [];
  // barkod → tip (öncelikli) ; barkodsuz PDF'ler için matchKey → veri seti barkodları
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'ilaclar-dataset.json'), 'utf-8'))[2].data;
  const keyToBarcodes = new Map();     // exact matchKey → [barkod]
  const brandDoseToBarcodes = new Map(); // marka+doz → [barkod]
  const knownBarcodes = new Set();
  const knownBrands = new Set();
  const push = (map, k, bc) => { if (!map.has(k)) map.set(k, []); map.get(k).push(bc); };
  for (const d of raw) {
    const bc = String(d.barcode || '').trim();
    if (bc) knownBarcodes.add(bc);
    const b = brandOf(d.Product_Name);
    if (b) knownBrands.add(b);
    if (!bc) continue;
    const k = matchKey(d.Product_Name);
    if (k) push(keyToBarcodes, k, bc);
    const bd = brandDose(d.Product_Name);
    if (bd) push(brandDoseToBarcodes, bd, bc);
  }

  const products = {};
  const residuals = { kirmizi: [], yesil: [] };
  const stat = {};
  const assign = (barcode, type) => {
    const cur = products[barcode];
    if (cur === undefined || PRIORITY[type] < PRIORITY[cur]) products[barcode] = type;
  };
  // Ad → veri seti barkodları: önce exact matchKey, sonra marka+doz.
  const matchName = (nm) => {
    const k = matchKey(nm);
    if (k && keyToBarcodes.has(k)) return keyToBarcodes.get(k);
    const bd = brandDose(nm);
    if (bd && brandDoseToBarcodes.has(bd)) return brandDoseToBarcodes.get(bd);
    return null;
  };

  // PDF listeleri (kırmızı, yeşil) — ad eşleştirme
  for (const doc of [docs.kirmizi, docs.yesil].filter(Boolean)) {
    const buf = await get(doc.url, true);
    const names = parsePdfNames(buf);
    let matched = 0;
    for (const nm of names) {
      const bcs = matchName(nm);
      if (bcs) { for (const bc of bcs) assign(bc, doc.type); matched++; }
      else if (knownBrands.has(brandOf(nm))) {
        // Eşleşmedi AMA markası veri setinde var → gerçek boşluk, elle bağlama adayı.
        residuals[doc.type].push(nm);
      }
      // markası veri setinde YOKSA: ürün retail sette yok (hastane-only jenerik vb.) → atla.
    }
    stat[doc.type] = { listeSatiri: names.length, eslesen: matched, elleAday: residuals[doc.type].length };
    sources.push({ type: doc.type, url: doc.url, date: doc.date });
    console.log(`${doc.type}: ${names.length} satır, ${matched} eşleşti, ${residuals[doc.type].length} elle-aday (markası sette var)`);
  }

  // XLSX (izleme) — barkod öncelikli, yoksa ad
  if (docs.izleme) {
    const buf = await get(docs.izleme.url, true);
    const rows = parseXlsx(buf);
    let byBarcode = 0, byName = 0;
    for (const r of rows) {
      const bc = String(r.A || '').replace(/\D/g, '');
      const name = r.B || '';
      if (bc && knownBarcodes.has(bc)) { assign(bc, 'izleme'); byBarcode++; continue; }
      const k = matchKey(name);
      const bcs = k && keyToBarcodes.get(k);
      if (bcs) { for (const b of bcs) assign(b, 'izleme'); byName++; }
    }
    stat.izleme = { listeSatiri: rows.length - 1, barkodEslesme: byBarcode, adEslesme: byName };
    sources.push({ type: 'izleme', url: docs.izleme.url, date: docs.izleme.date });
    console.log(`izleme: ${rows.length - 1} satır, barkod ${byBarcode} + ad ${byName} eşleşti`);
  }

  // Elle bağlama (residual doğrulaması): data/prescription-manual.json
  // { "barcodes": { "<barkod>": "kirmizi|yesil|mor|izleme" }, "note": "..." }
  // Otomatik eşleşmeyen ama markası sette olan ürünler eczacı onayıyla buraya eklenir.
  let manualCount = 0;
  try {
    const manual = JSON.parse(readFileSync(join(ROOT, 'data', 'prescription-manual.json'), 'utf-8'));
    for (const [bc, type] of Object.entries(manual.barcodes || {})) {
      if (!PRIORITY.hasOwnProperty(type)) { console.error(`prescription-manual: geçersiz tip '${type}' (${bc})`); process.exit(1); }
      assign(String(bc).trim(), type);
      manualCount++;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  if (manualCount) console.log(`elle bağlama: ${manualCount} ürün`);

  // Markası artık kapsanan (elle/otomatik bağlanan) residual'leri düş — gerçek
  // boşluk kalsın (ör. RITALINE elle bağlandıysa 'RITALIN' adayını gösterme).
  const byBcName = new Map(raw.map((d) => [String(d.barcode || '').trim(), d.Product_Name]));
  const coveredBrands = new Set();
  for (const bc of Object.keys(products)) {
    const nm = byBcName.get(bc);
    if (nm) coveredBrands.add(brandOf(nm));
  }
  for (const t of ['kirmizi', 'yesil']) {
    residuals[t] = residuals[t].filter((nm) => !coveredBrands.has(brandOf(nm)));
  }

  // Elle bağlama adaylarını (markası sette olan eşleşmeyenler) incelemeye yaz.
  writeFileSync(RESIDUAL_PATH, JSON.stringify({
    note: 'Otomatik eşleşmeyen ama markası veri setinde bulunan liste satırları. Eczacı incelemesi: her biri için doğru barkod(lar) prescription-manual.json\'a eklenmeli ya da retail sette yoksa yok sayılmalı.',
    generatedAt: new Date().toISOString(),
    kirmizi: residuals.kirmizi,
    yesil: residuals.yesil,
  }, null, 2));

  const counts = {};
  for (const t of Object.values(products)) counts[t] = (counts[t] || 0) + 1;
  const out = {
    note: 'TİTCK resmî renkli reçete listelerinden ürün-bazlı türetildi (scripts/titck-prescriptions-sync.mjs). barkod → reçete tipi.',
    generatedAt: new Date().toISOString(),
    sources,
    stat,
    counts,
    products,
  };
  writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log(`\nprescription-products.json yazıldı: ${Object.keys(products).length} ürün`, counts);
}

main().catch((e) => {
  console.error('Reçete listesi senkronu başarısız:', e.message);
  process.exit(1);
});
