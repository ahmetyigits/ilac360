// Barkod/karekod çözümleme — SAF modül (kamera/DOM bağımlılığı yok).
// Türk ilaç kutularında iki taşıyıcı var:
//   - EAN-13 çizgi barkod: 8699... (veri setindeki `barcode` alanıyla birebir)
//   - İTS GS1 DataMatrix "karekod": AI(01) GTIN-14 + seri/lot/SKT
// Dedektörden gelen ham değer burada veri setinin 13 haneli biçimine indirgenir.

// GS1 sembol tanımlayıcı önekleri (dedektöre göre gelebilir/gelmeyebilir)
const SYMBOLOGY_PREFIX = /^\](d2|Q3|C1|e0)/;
const GS = '\x1d'; // FNC1/GS ayıracı (ASCII 29, görünmez — kaçışla yazıldı)

// Sabit uzunluklu GS1 AI'ları (İTS karekodlarında görülenler).
// Değişken uzunluklular (21 seri, 10 lot, 240...) GS'e ya da dize sonuna dek sürer.
const FIXED_AI_LENGTHS = {
  '01': 14, // GTIN
  '11': 6,  // üretim tarihi
  '17': 6,  // son kullanma tarihi
};
const VARIABLE_AIS = new Set(['10', '21', '30', '240', '241', '712']);

export function ean13ChecksumValid(digits) {
  if (!/^\d{13}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10 === Number(digits[12]);
}

// GS1 yükünden AI(01) GTIN-14 değerini çıkarır; bulunamazsa null.
export function extractGtinFromGs1(payload) {
  let s = payload.replace(SYMBOLOGY_PREFIX, '');
  if (s.startsWith(GS)) s = s.slice(1);

  // AI yürüyüşü: 2 haneli (gerekirse 3 haneli) AI oku, alanını tüket.
  let i = 0;
  let guard = 0;
  while (i < s.length - 1 && guard++ < 40) {
    let ai = s.slice(i, i + 2);
    let aiLen = 2;
    if (!(ai in FIXED_AI_LENGTHS) && !VARIABLE_AIS.has(ai)) {
      const ai3 = s.slice(i, i + 3);
      if (VARIABLE_AIS.has(ai3)) { ai = ai3; aiLen = 3; }
    }
    i += aiLen;
    if (ai === '01') {
      const gtin = s.slice(i, i + 14);
      if (/^\d{14}$/.test(gtin)) return gtin;
      break;
    }
    if (ai in FIXED_AI_LENGTHS) {
      i += FIXED_AI_LENGTHS[ai];
      if (s[i] === GS) i += 1;
      continue;
    }
    if (VARIABLE_AIS.has(ai)) {
      const gsIdx = s.indexOf(GS, i);
      i = gsIdx === -1 ? s.length : gsIdx + 1;
      continue;
    }
    break; // tanınmayan AI — yürüyüşü bırak, regex'e düş
  }

  // Emniyet ağı: yürüyüş başarısızsa düz desen araması — 01 yalnız güvenli
  // konumda (dize başı, GS sonrası veya sembol öneki sonrası) aranır.
  // eslint-disable-next-line no-control-regex -- GS (ASCII 29) GS1 standardının ayıracıdır
  const m = payload.match(/(?:^|\x1d|\]d2|\]Q3)01(\d{14})/);
  return m ? m[1] : null;
}

/**
 * Dedektör ham değerini veri setiyle aranabilir rakam dizisine çevirir.
 * @param {string} rawValue  dedektörün rawValue çıktısı
 * @param {string} format    'ean_13' | 'data_matrix' | 'qr_code' | ...
 * @returns {string|null}    null → GS1/ilaç barkodu değil, taramaya devam
 */
export function normalizeBarcode(rawValue, format) {
  if (!rawValue) return null;
  const raw = rawValue.trim();

  if (format === 'ean_13') {
    return /^\d{13}$/.test(raw) ? raw : /^\d{8}$/.test(raw) ? raw : null;
  }

  if (format === 'data_matrix' || format === 'qr_code') {
    const gtin = extractGtinFromGs1(raw);
    if (!gtin) return null;
    // İTS birim karekodlarında gösterge hanesi 0'dır: 0 + EAN-13.
    // 0'ı atınca dataset'in 13 hanesi kalır; QR gürültüsüne karşı checksum şartı.
    if (gtin.startsWith('0')) {
      const ean13 = gtin.slice(1);
      return ean13ChecksumValid(ean13) ? ean13 : null;
    }
    // Gösterge ≠ 0 (koli/multipack): 14 hane döner; arama büyük olasılıkla boş
    // kalır ve kullanıcı rakamları input'ta görür — dürüst sonuç.
    return gtin;
  }

  return null;
}
