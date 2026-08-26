// TİTCK KT (prospektüs) PDF'lerinin KALICI URL'lerini çeker → data/titck-kt-urls.json
// ({ "b:<barkod>": "<tam KT PDF URL>" }). Böylece ilaç detayında "Prospektüsü
// TİTCK'de oku" linki gösterilebilir.
//
// Yaklaşım: TİTCK datatable'ı (getkubktviewdatatable) bir kez çekilir (PDF
// İNDİRMEDEN), her kaydın ktPdf tam URL'si alınır; URL'nin dosya-adı kök'ü
// (pdfKey) ile MEVCUT data/titck-kt-map.json (barkod→pdfKey) birleştirilir.
// Böylece ad-eşleştirme yeniden yapılmaz; sadece pdfKey→URL eklenir.
//
// AĞ/CSRF'e bağımlı — TİTCK erişilemezse hata verir ve çıkar; bu durumda
// titck-kt-urls.json güncellenmez ve UI mevcut genel arşiv linkine düşer.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAP_PATH = join(ROOT, 'data', 'titck-kt-map.json');
const OUT_PATH = join(ROOT, 'data', 'titck-kt-urls.json');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ilac360-arastirma';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, opts = {}, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
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
  const cookies = (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
  if (!token) throw new Error('CSRF token bulunamadı — sayfa yapısı değişmiş olabilir.');
  return { token, cookies };
}

const pdfOf = (html) => html?.match(/href=\\?"(https:[^"\\]+\.pdf)/)?.[1]?.replace(/\\\//g, '/') || null;
const pdfKeyOf = (url) => url.split('/').pop().replace(/\.pdf$/i, '');

async function fetchUrlByKey() {
  const { token, cookies } = await getSession();
  const urlByKey = new Map();
  const pageSize = 5000;
  let total = Infinity;
  for (let start = 0; start < total; start += pageSize) {
    const body = new URLSearchParams({
      _token: token,
      draw: String(start / pageSize + 1),
      start: String(start),
      length: String(pageSize),
      'search[value]': '',
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
    for (const row of json.data) {
      const url = pdfOf(row.documentPathKt);
      if (url) urlByKey.set(pdfKeyOf(url), url);
    }
    console.log(`  ${Math.min(start + pageSize, total)}/${total} kayıt tarandı...`);
    await sleep(800);
  }
  return urlByKey;
}

async function main() {
  if (!existsSync(MAP_PATH)) {
    console.error(`Gerekli dosya yok: ${MAP_PATH} (önce titck-merge-desc çalıştırılmalı).`);
    process.exit(1);
  }
  const ktMap = JSON.parse(readFileSync(MAP_PATH, 'utf-8'));
  const urlByKey = await fetchUrlByKey();
  const out = {};
  let hit = 0;
  for (const [barKey, pdfKey] of Object.entries(ktMap)) {
    const url = urlByKey.get(pdfKey);
    if (url) { out[barKey] = url; hit++; }
  }
  writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log(`titck-kt-urls.json yazıldı: ${hit}/${Object.keys(ktMap).length} ürün eşleşti (${urlByKey.size} benzersiz KT URL).`);
}

main().catch((e) => {
  console.error('TİTCK URL çekme başarısız:', e.message);
  console.error('(UI mevcut genel TİTCK arşiv linkine düşer; erişimli bir ortamda tekrar deneyin.)');
  process.exit(1);
});
