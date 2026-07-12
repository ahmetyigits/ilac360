// Yazım hatası toleransı — bağımlılıksız, yalnız tam arama 0 sonuç dönünce.
// Strateji: 20.559 ürünün TAMAMINI taramak yerine, ürün adlarının İLK (marka)
// tokenlarından bir kez harita kurulur (~birkaç bin benzersiz token) ve sorgu
// bu tokenlara bantlı Levenshtein ile karşılaştırılır. Hedef < 30ms.

import { getDrugs, searchFold } from './drugStore.js';

// uzunluk 3-5 → 1 hata; ≥6 → 2 hata toleransı
function maxDistFor(len) {
  if (len < 3) return 0;
  return len <= 5 ? 1 : 2;
}

// Bantlı Levenshtein: mesafe maxDist'i aşarsa erken çıkar (-1 döner).
export function boundedLevenshtein(a, b, maxDist) {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return -1;
  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const from = Math.max(1, i - maxDist);
    const to = Math.min(lb, i + maxDist);
    for (let j = 1; j <= lb; j++) {
      if (j < from || j > to) {
        curr[j] = maxDist + 1; // bant dışı
        continue;
      }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return -1; // bu satırda tolerans aşıldı
    [prev, curr] = [curr, prev];
  }
  return prev[lb] <= maxDist ? prev[lb] : -1;
}

// Marka tokenı → o tokenla başlayan ürün sayısı (öneri sıralaması için)
let brandTokens = null;

function buildBrandTokens() {
  const map = new Map();
  for (const drug of getDrugs()) {
    const first = (drug._nameL || '').split(/\s+/, 1)[0];
    if (!first || first.length < 3 || /^\d/.test(first)) continue;
    map.set(first, (map.get(first) || 0) + 1);
  }
  return map;
}

// Test/veri değişimi için haritayı sıfırlama kancası
export function resetFuzzyIndex() {
  brandTokens = null;
}

/**
 * "aspirn" → ['aspirin', ...] — mesafe artan, ürün sayısı azalan sırayla.
 */
export function getSuggestions(query, { limit = 3 } = {}) {
  const q = searchFold(String(query || '').trim()).split(/\s+/, 1)[0];
  const maxDist = maxDistFor(q.length);
  if (!q || maxDist === 0) return [];
  if (!brandTokens) brandTokens = buildBrandTokens();

  const candidates = [];
  for (const [token, count] of brandTokens) {
    if (Math.abs(token.length - q.length) > maxDist) continue;
    // Ucuz ön filtre: ilk İKİ karakter de farklıysa (transpozisyona toleranslı) atla
    if (token[0] !== q[0] && token[1] !== q[1]) continue;
    const dist = boundedLevenshtein(q, token, maxDist);
    if (dist > 0) candidates.push({ token, dist, count });
  }

  candidates.sort((a, b) => a.dist - b.dist || b.count - a.count);
  return candidates.slice(0, limit).map((c) => c.token);
}
