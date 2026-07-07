// Türkçe metin normalizasyonu — tek doğruluk kaynağı.
// Hem client kodu hem de scripts/*.mjs (build/smoke-test) buradan import eder;
// build ile runtime'ın aynı normalizasyonu kullanması veri tutarlılığı için şarttır.

export function turkishLower(str) {
  return String(str)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ş/g, 'ş')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü')
    .replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .toLowerCase();
}

// Arama karşılaştırmaları için: turkishLower + ı→i katlaması.
// Veri setinde ürün adları kâh Latin büyük harfle ("IBURAMIN") kâh Türkçe
// ("İBUPROFEN") yazılmış; ı/i ayrımı korunursa kullanıcı sorgusu bu kayıtları
// bulamaz. Kimlik karşılaştırması değil, arama eşleştirmesi içindir.
export function searchFold(str) {
  return turkishLower(str).replace(/ı/g, 'i');
}

export function flexibleIncludes(haystack, needle) {
  if (!haystack || !needle) return false;
  return searchFold(haystack).includes(searchFold(needle));
}

export function flexibleEquals(a, b) {
  return searchFold(a) === searchFold(b);
}

export const INVALID_INGREDIENTS = new Set([
  'etken maddesi bilgisi bulunamadı.',
  'etken maddesi bilgisi bulunamadı',
  'other cold preparations',
  'bilinmiyor',
  '-',
  '—',
]);

export function isValidIngredient(ingredient) {
  if (!ingredient || !String(ingredient).trim()) return false;
  return !INVALID_INGREDIENTS.has(turkishLower(String(ingredient).trim()));
}

export function cleanCategories(drug) {
  const cats = [drug.Category_1, drug.Category_2, drug.Category_3, drug.Category_4, drug.Category_5]
    .map((c) => c?.trim())
    .filter((c) => c && c.length > 0 && c !== 'Yok');
  return [...new Set(cats)];
}

export const INVALID_DESCRIPTION_MARKERS = [
  'ikinci siteye ait içerik bulunamadı',
  'içerik bulunamadı',
  'bilgi bulunamadı',
];

export function isValidDescription(d) {
  if (!d || typeof d !== 'string') return false;
  const trimmed = d.trim();
  if (trimmed.length < 50) return false;
  const lower = turkishLower(trimmed);
  for (const marker of INVALID_DESCRIPTION_MARKERS) {
    if (lower.includes(marker)) return false;
  }
  return true;
}

// Prospektüs metninden "ne için kullanılır" bölümünü çıkarır.
export function extractUsageSection(description) {
  if (!description) return null;
  const lower = turkishLower(description);
  const startMarkers = [
    'ne için kullanılır', 'nedir ve ne için kullanılır', 'endikasyonlar', 'endikedir',
    'endikasyon', 'kullanım alanı', 'kullanım alanları', 'kullanıldığı durumlar',
    'kullanılır', 'tedavisinde', 'tedavisi için', 'etkilidir', 'neyi tedavi eder',
    'terapötik endikasyon',
  ];
  const endMarkers = [
    'kullanmadan önce', 'nasıl kullanılır', 'kullanırken dikkat', 'kullanmayınız',
    'yan etki', 'olası yan etki', 'istenmeyen etki', 'doz aşımı', 'saklama koşul',
    'içeri̇k', 'içerik', 'kontrendikasyon', 'uyarı',
  ];
  let startIdx = -1;
  for (const marker of startMarkers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1) { startIdx = idx; break; }
  }
  if (startIdx === -1) return null;
  let endIdx = description.length;
  for (const marker of endMarkers) {
    const idx = lower.indexOf(marker, startIdx + 20);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }
  return description.substring(startIdx, endIdx);
}
