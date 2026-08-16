// TİTCK KÜB/KT arşivinden prospektüs (KT) toplama aracı — yarı-otomatik.
//
//   node scripts/titck-sync.mjs --cache <dizin> --list            → listeyi çek + eşleştirme raporu
//   node scripts/titck-sync.mjs --cache <dizin> --download        → eksik KT PDF'lerini indir + metin çıkar
//   node scripts/titck-sync.mjs --cache <dizin> --download --limit 100
//
// Kaynak: https://www.titck.gov.tr/kubkt (kamu kurumu, kamuya açık KT arşivi).
// Nazik davranır: istekler arası bekleme, tekrar denemeli, KALDIĞI YERDEN devam
// eder (indirilmiş PDF/çıkarılmış TXT atlanır). PDF→metin için Ghostscript
// (gs -sDEVICE=txtwrite) gerekir.
//
// Cache dizini repo DIŞINDA tutulmalıdır (binlerce PDF; bulut senkron klasörüne
// koymayın). Çıkarılan metinler scripts/titck-merge-desc.mjs ile veri setine işlenir.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { searchFold, isValidIngredient } from '../client/src/data/turkishText.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
function argValue(name, fallback = null) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  return args[i + 1] ?? fallback;
}
const CACHE = argValue('--cache');
const doList = args.includes('--list');
const doDownload = args.includes('--download');
const limit = parseInt(argValue('--limit', '0'), 10) || Infinity;

// (Kullanım kontrolü dosya sonundaki isMain bloğundadır — modül olarak import
// edilirken argüman zorunluluğu yoktur; matchKey testler/analizler için dışa açık.)
const PDF_DIR = CACHE ? join(CACHE, 'pdf') : null;
const TXT_DIR = CACHE ? join(CACHE, 'txt') : null;
const LIST_PATH = CACHE ? join(CACHE, 'kubkt-list.json') : null;
const MATCH_PATH = CACHE ? join(CACHE, 'matches.json') : null;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ilac360-arastirma';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Eşleştirme anahtarı ----
// TİTCK adlarında ambalaj adedi genellikle yoktur ("DOLARİT 300 mg film tablet"),
// veri setinde vardır ("DOLARIT 300 MG 10 FILM TABLET, 20 ADET"). Fold + doz
// DIŞI sayıların atılmasıyla iki taraf aynı anahtara düşer: mg/ml/g/mcg/iu/%
// öncesindeki sayılar doz bilgisidir ve KALIR; "10 film tablet", "20 adet"
// gibi adet sayıları atılır.
const UNIT_AFTER = new Set(['mg', 'ml', 'mcg', 'g', 'gr', 'iu', 'ie', 'mikrogram', 'mg/ml', 'saat']);
// Veri seti adları çoğunlukla ASCII ("SURUP", "COZELTI", "GOZ"), TİTCK adları
// Türkçe karakterli ("ŞURUP", "ÇÖZELTİ", "GÖZ") — eşleştirme için ikisi de
// ASCII'ye katlanır (searchFold yalnız ı→i katlar).
const asciiFold = (s) => s
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o')
  .replace(/ş/g, 's').replace(/ü/g, 'u');
export function matchKey(name) {
  if (!name) return null;
  let folded = asciiFold(searchFold(name))
    .replace(/(\d)[.,](?=\d{3}\b)/g, '$1') // binlik ayraç: "3.000.000" → "3000000"
    .replace(/(\d),(\d)/g, '$1.$2')  // ondalık virgül → nokta ("0,02" ≡ "0.02")
    .replace(/\([^)]*\)/g, ' ')      // parantezli ambalaj notları
    .replace(/[,;.]/g, ' ')
    .replace(/%\s*/g, '% ')           // "%0.4" → "% 0.4" (tek biçim)
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = folded.split(' ');
  const kept = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^\d+([.,/]\d+)*$/.test(t)) {
      const next = tokens[i + 1];
      const prev = tokens[i - 1];
      // Doz sayısı: birimden önce ("300 mg") veya % işaretinden sonra ("% 0.4")
      if ((next && UNIT_AFTER.has(next)) || prev === '%') {
        kept.push(t.replace(/,/g, '.'));
      }
      continue; // adet/ambalaj sayısı atılır
    }
    if (t === 'adet' || t === 'ambalaj' || t === 'kutu' || t === 'kutuda') continue;
    kept.push(t);
  }
  return kept.join(' ');
}

// ---- TİTCK listesi çekme ----
async function fetchWithRetry(url, options, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 419 || res.status === 403) throw new Error(`HTTP ${res.status} (token/çerez bayat olabilir)`);
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (attempt === tries) throw e;
      await sleep(2000 * attempt);
    }
  }
}

async function getSession() {
  const res = await fetchWithRetry('https://www.titck.gov.tr/kubkt', { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const token = html.match(/_token:\s*"([^"]+)"/)?.[1];
  const cookies = (res.headers.getSetCookie?.() || [])
    .map((c) => c.split(';')[0])
    .join('; ');
  if (!token) throw new Error('CSRF token bulunamadı — sayfa yapısı değişmiş olabilir.');
  return { token, cookies };
}

async function fetchList() {
  const { token, cookies } = await getSession();
  const all = [];
  const pageSize = 5000;
  let total = Infinity;
  for (let start = 0; start < total; start += pageSize) {
    const body = new URLSearchParams({
      _token: token,
      draw: String(start / pageSize + 1),
      start: String(start),
      length: String(pageSize),
      'search[value]': '',
      // order parametreleri zorunlu — eksikse sunucu 500 döner
      'order[0][column]': '0',
      'order[0][dir]': 'asc',
    });
    const res = await fetchWithRetry('https://www.titck.gov.tr/getkubktviewdatatable', {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Cookie: cookies,
        'X-Requested-With': 'XMLHttpRequest',
        Referer: 'https://www.titck.gov.tr/kubkt',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const json = await res.json();
    total = json.recordsTotal;
    const pdfOf = (html) => html?.match(/href=\\?"(https:[^"\\]+\.pdf)/)?.[1]?.replace(/\\\//g, '/') || null;
    for (const row of json.data) {
      all.push({
        name: row.name,
        ingredient: row.element || null,
        firm: row.firmName || null,
        ktPdf: pdfOf(row.documentPathKt),
        kubPdf: pdfOf(row.documentPathKub),
      });
    }
    console.log(`  ${all.length}/${total} kayıt alındı...`);
    await sleep(800);
  }
  writeFileSync(LIST_PATH, JSON.stringify(all));
  console.log(`Liste kaydedildi: ${LIST_PATH} (${all.length} kayıt)`);
  return all;
}

// ---- Eşleştirme ----
function buildMatches(list) {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'ilaclar-dataset.json'), 'utf-8'));
  const drugs = raw[2].data;

  const titckByKey = new Map();
  const titckByBrand = new Map(); // marka → [{key, tokens, item}] (ikincil bulanık geçiş için)
  for (const item of list) {
    if (!item.ktPdf) continue;
    const key = matchKey(item.name);
    if (!key) continue;
    if (!titckByKey.has(key)) titckByKey.set(key, item);
    const brand = key.split(' ')[0];
    let arr = titckByBrand.get(brand);
    if (!arr) { arr = []; titckByBrand.set(brand, arr); }
    arr.push({ key, tokens: new Set(key.split(' ')), item });
  }

  // İkincil geçiş: TİTCK adı, veri seti adının alt kümesiyse (veri seti adları
  // ambalaj bilgisiyle daha uzundur) ve marka içinde TEK aday bu koşulu
  // sağlıyorsa eşleştir. Birden çok aday uyarsa (doz belirsizliği) atlanır.
  function fuzzyFind(dsKey) {
    const dsTokens = new Set(dsKey.split(' '));
    const brand = dsKey.split(' ')[0];
    const candidates = (titckByBrand.get(brand) || []).filter(({ tokens }) => {
      for (const t of tokens) if (!dsTokens.has(t)) return false;
      return true;
    });
    // Aynı PDF'e giden mükerrer adaylar tek sayılır
    const pdfs = new Set(candidates.map((c) => c.item.ktPdf));
    return pdfs.size === 1 ? candidates[0].item : null;
  }

  const matches = [];      // { id, name, key, ktPdf, titckName }
  let already = 0;
  let unmatched = 0;
  const ingredientMismatch = [];
  let fuzzyCount = 0;
  for (const d of drugs) {
    const hasDesc = (d.Description || '').trim().length >= 50;
    const key = matchKey(d.Product_Name);
    let hit = key ? titckByKey.get(key) : null;
    if (!hit && key) {
      hit = fuzzyFind(key);
      if (hit) fuzzyCount++;
    }
    if (!hit) {
      if (!hasDesc) unmatched++;
      continue;
    }
    if (hasDesc) {
      already++;
      continue;
    }
    // Etken madde tutarlılık RAPORU — tam ad+doz+form eşleşmesi zaten güçlü
    // bir sinyal olduğundan uyuşmazlık REDDETMEZ, yalnız insan incelemesi için
    // listelenir (İngilizce/Türkçe yazım farkları — carbocisteine/karbosistein,
    // selegilin/selejilin — sahte uyuşmazlık üretir; 4 harflik önek benzerliği
    // olanlar raporda da gösterilmez).
    const dsIng = isValidIngredient(d.Active_Ingredient) ? searchFold(d.Active_Ingredient) : '';
    const ttIng = searchFold(hit.ingredient || '');
    if (dsIng && ttIng) {
      const dsTokens = [...new Set(dsIng.split(/[^a-zçğıöşü]+/).filter((t) => t.length > 3))];
      const ttTokens = ttIng.split(/[^a-zçğıöşü]+/).filter((t) => t.length > 3);
      const fuzzyCommon = ttTokens.some((tt) =>
        dsTokens.some((dt) => dt.slice(0, 4) === tt.slice(0, 4)));
      if (!fuzzyCommon && dsTokens.length > 0 && ttTokens.length > 0) {
        ingredientMismatch.push(`${d.Product_Name} ⇄ ${hit.name} (${d.Active_Ingredient} ≠ ${hit.ingredient})`);
      }
    }
    matches.push({ id: String(d.ID), name: d.Product_Name, key, ktPdf: hit.ktPdf, titckName: hit.name });
  }

  writeFileSync(MATCH_PATH, JSON.stringify(matches));
  console.log('\n=== EŞLEŞTİRME RAPORU ===');
  console.log(`Veri seti ürünü                 : ${drugs.length}`);
  console.log(`Prospektüsü zaten olan          : ${drugs.filter((d) => (d.Description || '').trim().length >= 50).length}`);
  console.log(`TİTCK ile eşleşen + KT eksik    : ${matches.length} (${fuzzyCount} tanesi alt-küme eşleşmesi)`);
  console.log(`Eşleşemeyen (KT eksik)          : ${unmatched}`);
  console.log(`Etken madde uyuşmazlığı (RAPOR) : ${ingredientMismatch.length}`);
  for (const m of ingredientMismatch.slice(0, 8)) console.log(`  ! ${m}`);
  const uniquePdfs = new Set(matches.map((m) => m.ktPdf)).size;
  console.log(`İndirilecek benzersiz KT PDF    : ${uniquePdfs}`);
  console.log(`Eşleşmeler kaydedildi: ${MATCH_PATH}`);
  return matches;
}

// ---- İndirme + metin çıkarma ----
const pdfFileName = (url) => url.split('/').pop();

function extractText(pdfPath, txtPath) {
  try {
    execFileSync('gs', ['-q', '-sDEVICE=txtwrite', '-o', txtPath, pdfPath], { timeout: 60000, stdio: 'pipe' });
    const text = readFileSync(txtPath, 'utf-8');
    if (text.trim().length < 500) throw new Error('çıkan metin çok kısa');
    return true;
  } catch {
    return false;
  }
}

async function download(matches) {
  const unique = [...new Map(matches.map((m) => [m.ktPdf, m])).values()];
  let done = 0, skipped = 0, failed = 0, extracted = 0;
  const failures = [];
  for (const m of unique) {
    if (done + skipped >= limit) break;
    const base = pdfFileName(m.ktPdf);
    const pdfPath = join(PDF_DIR, base);
    const txtPath = join(TXT_DIR, base.replace(/\.pdf$/i, '.txt'));
    if (existsSync(txtPath)) { skipped++; continue; }
    try {
      if (!existsSync(pdfPath) || statSync(pdfPath).size === 0) {
        const res = await fetchWithRetry(m.ktPdf, { headers: { 'User-Agent': UA } });
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(pdfPath, buf);
        await sleep(400); // nazik hız: ~2 istek/sn altı
      }
      if (extractText(pdfPath, txtPath)) extracted++;
      else { failed++; failures.push(`${m.name}: metin çıkarılamadı`); }
      done++;
      if (done % 100 === 0) console.log(`  indirilen ${done} · atlanan ${skipped} · hata ${failed}`);
    } catch (e) {
      failed++;
      failures.push(`${m.name}: ${e.message}`);
      await sleep(2000);
    }
  }
  console.log('\n=== İNDİRME RAPORU ===');
  console.log(`Bu koşuda indirilen : ${done}`);
  console.log(`Zaten mevcut (atla) : ${skipped}`);
  console.log(`Metin çıkarılan     : ${extracted}`);
  console.log(`Hata                : ${failed}`);
  for (const f of failures.slice(0, 10)) console.log(`  ✗ ${f}`);
  const txtCount = readdirSync(TXT_DIR).filter((f) => f.endsWith('.txt')).length;
  console.log(`Toplam çıkarılmış metin: ${txtCount} / ${unique.length}`);
}

// ---- Akış ----
import { pathToFileURL } from 'url';
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (!CACHE || (!doList && !doDownload)) {
    console.error('Kullanım: node scripts/titck-sync.mjs --cache <dizin> --list | --download [--limit N]');
    process.exit(1);
  }
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(PDF_DIR, { recursive: true });
  mkdirSync(TXT_DIR, { recursive: true });
  if (doList) {
    const list = existsSync(LIST_PATH) && !args.includes('--refresh')
      ? JSON.parse(readFileSync(LIST_PATH, 'utf-8'))
      : await fetchList();
    if (existsSync(LIST_PATH) && !args.includes('--refresh')) {
      console.log(`Mevcut liste kullanıldı: ${LIST_PATH} (${list.length} kayıt) — yenilemek için --refresh`);
    }
    buildMatches(list);
  }
  if (doDownload) {
    if (!existsSync(MATCH_PATH)) {
      console.error('Önce --list ile eşleştirme üretin.');
      process.exit(1);
    }
    const matches = JSON.parse(readFileSync(MATCH_PATH, 'utf-8'));
    await download(matches);
  }
}
