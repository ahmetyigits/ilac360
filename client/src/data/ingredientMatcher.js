// Etken madde normalizasyonu ve karşılaştırması — etkileşim motorunun temeli.
//
// Veri setindeki etken madde alanı serbest metin: "İzokonazol Nitrat + Diflukortolon
// Valerat", "metronidazol/mikonazol nitrat/lidokain", "Parasetamol, asetilsalisilik
// asit, kafein" gibi. Kurallarla eşleştirme substring ile DEĞİL, bileşenlere ayırıp
// tuz/ester ekini attıktan sonra TAM EŞİTLİK ile yapılır — "sildenafil+nitrat"
// kuralının "Mikonazol Nitrat" kremiyle eşleşmesi gibi yanlış pozitifler bu yüzden
// mümkün değildir.

import { searchFold, isValidIngredient } from './turkishText.js';

// Organik ilaç adlarında SONA gelen tuz/ester/hidrat ekleri. Bunlar farmakolojik
// kimliği değiştirmez: "amlodipin besilat" ≡ "amlodipin".
// DİKKAT: "dinitrat"/"trinitrat" bilerek listede YOK — "izosorbid dinitrat" ve
// "gliseril trinitrat"ta bunlar molekülün kendisidir, tuz eki değildir.
const SALT_TOKENS = new Set([
  'hidroklorür', 'hidroklorid', 'hcl', 'dihidroklorür',
  'sülfat', 'hidrojensülfat', 'nitrat', 'fosfat', 'difosfat', 'hidrojenfosfat',
  'klorür', 'bromür', 'hidrobromür', 'iyodür',
  'besilat', 'mesilat', 'tosilat', 'maleat', 'malat', 'tartarat', 'bitartarat',
  'fumarat', 'suksinat', 'sitrat', 'asetat', 'oksalat', 'laktat', 'glukonat',
  'aspartat', 'stearat', 'palmitat', 'pivalat', 'valerat', 'kaproat',
  'propiyonat', 'dipropiyonat', 'butirat', 'enantat', 'dekanoat', 'undesilenat',
  'karbonat', 'bikarbonat',
  'monohidrat', 'dihidrat', 'trihidrat', 'hemihidrat', 'seskihidrat', 'hidrat', 'anhidrat',
  'disproksil', 'fumarat', 'etabonat', 'alafenamid',
  // Ester/prodrug ekleri: farmakolojik olarak ana moleküle eşdeğer
  // (kandesartan sileksetil ≡ kandesartan, sefuroksim aksetil ≡ sefuroksim)
  'sileksetil', 'medoksomil', 'aksetil', 'proksetil', 'mofetil', 'pivoksil', 'eteksilat',
  'sodyum', 'disodyum', 'potasyum', 'kalsiyum', 'magnezyum', 'trometamol', 'meglumin',
  'hbr', 'dietilamonyum', 'dietilamin', 'epolamin',
  // OCR/yazım varyantları ve eksik kalan tuz/ester/form ekleri (2026-08 sessiz
  // boşluk denetimi): bunlar eksikken "ketiapin hemifumarat" QT etiketini,
  // "eritromisin estolat" makrolid kurallarını sessizce ıskalıyordu.
  'hci', 'hidroklorur', 'hidroklorürt',
  'hemifumarat', 'estolat', 'etilsüksinat', 'okzalat',
  'hemhidrat', 'hermihidrat', 'aseponat', 'base',
  // Formülasyon kelimeleri (pellet kapsül içerikleri) — molekül kimliği değildir
  'pellet', 'pelletleri',
]);

// Adı katyonla BAŞLAYAN bileşikler inorganik tuzlardır ("kalsiyum karbonat",
// "lityum karbonat", "sodyum klorür") — bunlarda ad bütün olarak etken maddedir,
// sondan ek atılmaz. Gerekli kimlik eşlemeleri sinonim tablosunda yapılır
// (ör. "lityum karbonat" → "lityum").
const LEADING_CATIONS = new Set([
  'sodyum', 'disodyum', 'potasyum', 'kalsiyum', 'magnezyum',
  'lityum', 'demir', 'çinko', 'alüminyum', 'amonyum',
]);

// Kimlik karşılaştırması için normalize: searchFold + parantezli notları at +
// boşluk topla. Bozuk/geçersiz kayıtlarda null döner.
export function normalizeText(ingredient) {
  if (!ingredient || typeof ingredient !== 'string') return null;
  const trimmed = ingredient.trim();
  if (!trimmed) return null;
  // Serileştirilmiş obje artıkları (kaynak veride Python-dict kalıntısı kayıtlar var)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return null;
  if (!isValidIngredient(trimmed)) return null;
  const cleaned = searchFold(trimmed)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
}

// WHO ATC yer-tutucu stringleri: kaynak veride etken madde alanına sızmış sınıf
// tanımlarıdır ("combinations", "electrolytes"...). Gerçek bileşen sanılırlarsa
// hem sahte "ortak etkin madde" kartı üretirler hem eşdeğer gruplamayı bozarlar.
const PLACEHOLDER_COMPONENTS = new Set([
  'combinations', 'other combinations', 'various combinations',
  'combinations excl. psycholeptics', 'combinations of electrolytes',
  'electrolytes', 'electrolytes with carbohydrates',
  'electrolytes in combination with other drugs',
  'carbohydrates', 'various', 'amino acids',
  'various alimentary tract and metabolism products',
]);

// Çoklu etken madde stringini bileşenlerine ayırır: "," "+" "/" ";" ve " ve ".
export function splitComponents(normalized) {
  if (!normalized) return [];
  return normalized
    .split(/[,+/;]|\bve\b/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

// Sondaki tuz/ester tokenlarını atar: "mikonazol nitrat" → "mikonazol",
// "prednizolon sodyum fosfat" → "prednizolon". En az bir taban token kalır.
export function stripSalt(component) {
  const tokens = component.split(' ').filter(Boolean);
  if (tokens.length < 2) return component;
  if (LEADING_CATIONS.has(tokens[0])) return component;
  let end = tokens.length;
  while (end > 1 && SALT_TOKENS.has(tokens[end - 1])) end--;
  return tokens.slice(0, end).join(' ');
}

// Sinonim tablosu: { kanonik: [eşanlamlılar] } → alias→kanonik Map'i.
export function buildSynonymLookup(groups) {
  const lookup = new Map();
  if (!groups) return lookup;
  for (const [canonical, aliases] of Object.entries(groups)) {
    const c = stripSalt(searchFold(canonical).replace(/\s+/g, ' ').trim());
    lookup.set(c, c);
    for (const alias of aliases || []) {
      lookup.set(stripSalt(searchFold(alias).replace(/\s+/g, ' ').trim()), c);
    }
  }
  return lookup;
}

export function canonicalize(base, synonymLookup) {
  return (synonymLookup && synonymLookup.get(base)) || base;
}

// Bir ilacın etken madde stringinden kanonik bileşen kümesi üretir.
// Motor bunu ilaç başına BİR KEZ hesaplar; tüm eşleştirmeler bu küme üzerinden yapılır.
export function getComponents(ingredient, synonymLookup) {
  const normalized = normalizeText(ingredient);
  if (!normalized) return [];
  const bases = new Set();
  for (const part of splitComponents(normalized)) {
    const base = stripSalt(part);
    // Harf içermeyen token'lar bileşen değildir: aşı serotip numaraları
    // ("tip 6, 11, 16, 18") bileşen sayılırsa iki farklı aşı "ortak etkin
    // madde" yanlış pozitifi üretir.
    if (base && base.length >= 2 && /[a-z]/.test(base) && !PLACEHOLDER_COMPONENTS.has(base)) {
      bases.add(canonicalize(base, synonymLookup));
    }
  }
  return [...bases];
}

// Kanonik bileşen kümesinden deterministik grup anahtarı: "aynı etken madde"
// gruplaması (Keşfet) ve eşdeğerlik anahtarının bileşen yarısı bunu kullanır.
// Boş/geçersiz etken maddede null döner — çağıran gruplamamayı seçer.
export function componentKey(ingredient, synonymLookup) {
  const components = getComponents(ingredient, synonymLookup);
  if (components.length === 0) return null;
  return [...components].sort().join('+');
}

// Kural tarafındaki etken madde adını aynı boru hattından geçirir.
export function normalizeRuleIngredient(ruleIngredient, synonymLookup) {
  const normalized = normalizeText(ruleIngredient);
  if (!normalized) return null;
  return canonicalize(stripSalt(normalized), synonymLookup);
}
