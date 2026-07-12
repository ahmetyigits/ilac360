// Farmasötik form tespiti — ürün adından (searchFold'lanmış) ve ATC kodundan.
// Hem build (scripts/build-data.mjs) hem motor hem hastalık araması kullanır;
// Vite bağımlılığı YOKTUR.
//
// Klinik gerekçe: topikal (cilt/göz) formlarda sistemik emilim sınırlıdır;
// bileşen bazlı sistemik etkileşim uyarıları bu formlarda yanlış pozitif
// üretir (ör. diklofenak JEL × warfarin). Transdermal bantlar (fentanil,
// nitrogliserin TTS) ise SİSTEMİK etki eder ve asla bastırılmaz.

// Transdermal önce kontrol edilir — 'flaster' topikal görünse de sistemiktir.
const TRANSDERMAL_TOKENS = ['transdermal', 'flaster', 'patch', ' tts'];

// Ad tokenları (searchFold sonrası biçim: ı→i katlanmış küçük harf)
const TOPICAL_TOKENS = [
  'krem', 'jel', 'merhem', 'pomad', 'losyon', 'şampuan', 'ovül', 'ovul',
  'vajinal', 'rektal', 'gargara', 'sprey deri', 'deri spreyi', 'oje', 'topikal',
];
const OPHTHALMIC_TOKENS = ['göz damla', 'göz merhem', 'göz jel', 'oftalmik', 'kulak damla', 'nazal'];
const INHALE_TOKENS = ['inhalasyon', 'inhaler', 'nebul', 'aerosol'];
const ORAL_PARENTERAL_TOKENS = [
  'tablet', 'kapsül', 'kapsul', 'draje', 'şurup', 'surup', 'süspansiyon', 'suspansiyon',
  'granül', 'granul', 'efervesan', 'saşe', 'sase', 'ampul', 'flakon', 'enjeksiyon',
  'enjektabl', 'infüzyon', 'infuzyon', 'damla oral', 'oral damla', 'poşet', 'poset', 'kase',
];

// ATC ile topikal olduğu kesin gruplar — ad tokenından daha güçlü sinyal.
// D'nin TAMAMI değil (izotretinoin D10BA01 oraldır).
const TOPICAL_ATC_PREFIXES = ['M02AA', 'D01A', 'D06', 'D07', 'G01A'];
const OPHTHALMIC_ATC_PREFIXES = ['S01', 'S02', 'S03', 'R01A'];

/**
 * @param {string} nameL  searchFold'lanmış ürün adı (drug._nameL)
 * @param {string|null} atcCode
 * @returns {'topikal'|'oftalmik'|'transdermal'|'inhale'|'sistemik'|null}
 *   null → form belirlenemedi; çağıran SİSTEMİK varsaymalıdır (güvenli taraf).
 */
export function detectForm(nameL, atcCode) {
  if (!nameL) return null;
  const name = ` ${nameL} `;

  if (TRANSDERMAL_TOKENS.some((t) => name.includes(t))) return 'transdermal';

  const atc = atcCode && atcCode !== '0' ? atcCode.trim() : null;
  if (atc) {
    if (OPHTHALMIC_ATC_PREFIXES.some((p) => atc.startsWith(p))) return 'oftalmik';
    if (TOPICAL_ATC_PREFIXES.some((p) => atc.startsWith(p))) return 'topikal';
  }

  if (OPHTHALMIC_TOKENS.some((t) => name.includes(t))) return 'oftalmik';
  if (INHALE_TOKENS.some((t) => name.includes(t))) return 'inhale';
  if (TOPICAL_TOKENS.some((t) => name.includes(t))) return 'topikal';
  if (ORAL_PARENTERAL_TOKENS.some((t) => name.includes(t))) return 'sistemik';

  return null;
}

// Sistemik etkileşim uyarılarının bastırılacağı formlar.
// transdermal ve inhale BİLEREK dahil değil: gerçek sistemik etkileri vardır.
export function isLowSystemicForm(form) {
  return form === 'topikal' || form === 'oftalmik';
}
