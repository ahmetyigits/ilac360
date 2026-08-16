// Prospektüs (Kullanma Talimatı) metni biçimlendirme — SAF modül, Vite/DOM
// bağımlılığı yoktur; DrugCard render eder, Node testleri doğrudan çalıştırır.
//
// Kaynak metinler PDF/HTML kazıma artıklarıyla dolu: Windows-1252 kontrol
// karakterleri (\x95 madde imi 2.780 dokümanda), "Etkin madde:Her" gibi iki
// nokta bitişikleri (2.263 doküman), "DOSTINEXnedir" gibi marka adı yapışıkları
// (1.104 doküman), "KULLANMAYINIZAşağıdaki" gibi BÜYÜK dizisi yapışıkları.

// Windows-1252 kontrol aralığına düşmüş noktalama karşılıkları.
// \x95 madde imidir; satır başına alınır ki listeler liste gibi görünsün.
const CP1252_MAP = [
  [/\x95/g, '\n• '],
  [/[\x91\x92]/g, '’'],
  [/[\x93\x94\x84]/g, '"'],
  [/\x96/g, '–'],
  [/\x97/g, '—'],
  [/\x85/g, '…'],
  [/\x99/g, '™'],
  [/\x80/g, '€'],
  // Karşılığı kalmayan diğer C0/C1 kontrol karakterleri atılır
  // eslint-disable-next-line no-control-regex -- PDF kazıma artıklarını temizlemek bu modülün işi
  [/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, ' '],
];

export function normalizeDescription(raw) {
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (const [re, rep] of CP1252_MAP) text = text.replace(re, rep);
  return text
    // "2.DİKKAT" → "2. DİKKAT" (bölüm regex'i boşluk bekler)
    .replace(/([1-5])\.([A-ZÇĞİÖŞÜ])/g, '$1. $2')
    // Yapışık cümleleri ayır: "KULLANMAYINIZ.Eğer" → "KULLANMAYINIZ. Eğer"
    .replace(/([.!?])([A-ZÇĞİÖŞÜa-zçğıöşü])/g, '$1 $2')
    // Küçük harften büyük harfe geçişlerde ayır: "tabletDOLARIT" → "tablet DOLARIT"
    .replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2')
    // Emir kipiyle biten BÜYÜK başlık + Başlık yapışığı: "KULLANMAYINIZEğer" →
    // "KULLANMAYINIZ Eğer". Genel bir BÜYÜK+Başlık kuralı, marka adlarının son
    // harfini çalar ("DOSTINE Xnedir"); bu yüzden yalnız -NIZ/-NUZ sonekiyle sınırlı.
    .replace(/([A-ZÇĞİÖŞÜ]{2,}(?:NIZ|NİZ|NUZ|NÜZ))([A-ZÇĞİÖŞÜ])/g, '$1 $2')
    // BÜYÜK dizisi + küçük yapışığı: "DOSTINEXnedir" → "DOSTINEX nedir"
    .replace(/([A-ZÇĞİÖŞÜ]{3,})([a-zçğıöşü]{2,})/g, '$1 $2')
    // İki nokta bitişiği: "Etkin madde:Her" → "Etkin madde: Her" (rakam hariç — "12:30" bozulmaz)
    .replace(/:([A-Za-zÇĞİÖŞÜçğıöşü])/g, ': $1')
    // Sayfa numaralarını temizle
    .replace(/\d+\s*\/\s*\d+/g, '')
    // Madde imi dönüşümünün ürettiği fazla boşlukları topla
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// TİTCK KT şablonundaki standart alt başlıklar. Satır bazında eşleşir:
// ya satır bunlardan biriyle (aşağı yukarı) aynıdır ya da BÜYÜK kalıpla biter.
const SUBHEADING_EXACT = [
  'hamilelik',
  'emzirme',
  'araç ve makine kullanımı',
  'diğer ilaçlar ile birlikte kullanımı',
  'diğer ilaçlarla birlikte kullanımı',
  'yiyecek ve içecek ile kullanılması',
  'yiyecek ve içecekler ile kullanılması',
  'uygun kullanım ve doz/uygulama sıklığı için talimatlar',
  'uygulama yolu ve metodu',
  'değişik yaş grupları',
  'çocuklarda kullanımı',
  'çocuklarda kullanım',
  'yaşlılarda kullanımı',
  'yaşlılarda kullanım',
  'özel kullanım durumları',
  'böbrek yetmezliği',
  'karaciğer yetmezliği',
  'böbrek/karaciğer yetmezliği',
];

const turkishTrimLower = (s) => s.trim().replace(/\s+/g, ' ').replace(/[:.]$/, '').toLocaleLowerCase('tr');

export function isSubheadingLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (trimmed.startsWith('•')) return false;
  // "X'i aşağıdaki durumlarda KULLANMAYINIZ" / "... DİKKATLİ KULLANINIZ"
  if (/KULLANMAYINIZ[:.]?$/.test(trimmed) || /DİKKATLİ KULLANINIZ[:.]?$/.test(trimmed)) return true;
  const folded = turkishTrimLower(trimmed);
  if (SUBHEADING_EXACT.includes(folded)) return true;
  // "Kullanmanız gerekenden daha fazla X kullandıysanız" / "X'i kullanmayı unutursanız"
  if (folded.startsWith('kullanmanız gerekenden daha fazla')) return true;
  if (folded.endsWith('kullanmayı unutursanız')) return true;
  if (folded.includes('tedavi sonlandırıldığında')) return true;
  if (folded.endsWith('yardımcı maddeler hakkında önemli bilgiler')) return true;
  return false;
}

// Bölüm içeriğini {subheading, text} parçalarına ayırır; alt başlık yoksa tek
// parça döner. Metin whitespace-pre-line ile render edildiğinden \n korunur.
export function splitSubheadings(content) {
  if (!content) return [];
  const lines = content.split('\n');
  const parts = [];
  let current = { subheading: null, textLines: [] };
  for (const line of lines) {
    if (isSubheadingLine(line)) {
      if (current.textLines.length > 0 || current.subheading) {
        parts.push({ subheading: current.subheading, text: current.textLines.join('\n').trim() });
      }
      current = { subheading: line.trim(), textLines: [] };
    } else {
      current.textLines.push(line);
    }
  }
  if (current.textLines.length > 0 || current.subheading) {
    parts.push({ subheading: current.subheading, text: current.textLines.join('\n').trim() });
  }
  return parts.filter((p) => p.subheading || p.text);
}

export function parseDescription(raw) {
  if (!raw || raw.trim().length === 0) return null;
  if (raw.includes('İkinci siteye ait içerik bulunamadı')) return null;

  const text = normalizeDescription(raw);

  const sectionRegex = /([1-5])\.\s+([A-ZÇĞİÖŞÜ][^\n]{5,})/g;
  const allMatches = [...text.matchAll(sectionRegex)];

  const withGap = allMatches.map((m, i) => {
    const nextMatch = allMatches[i + 1];
    const gap = nextMatch
      ? nextMatch.index - (m.index + m[0].length)
      : text.length - (m.index + m[0].length);
    return { match: m, gap };
  });

  const contentSections = withGap.filter((item) => item.gap > 50);

  const uniqueSections = [];
  const seenNumbers = new Set();
  for (const item of contentSections) {
    const num = item.match[1];
    if (!seenNumbers.has(num)) {
      seenNumbers.add(num);
      uniqueSections.push(item.match);
    }
  }

  if (uniqueSections.length < 2) {
    return [{ title: null, content: text, parts: splitSubheadings(text) }];
  }

  const sections = [];

  const beforeFirst = text.slice(0, uniqueSections[0].index).trim();
  if (beforeFirst.length > 20) {
    sections.push({ title: null, content: beforeFirst, parts: splitSubheadings(beforeFirst) });
  }

  for (let i = 0; i < uniqueSections.length; i++) {
    const start = uniqueSections[i].index;
    const end = i + 1 < uniqueSections.length ? uniqueSections[i + 1].index : text.length;
    const fullText = text.slice(start, end).trim();

    const titleEnd = fullText.indexOf('\n');
    const title = titleEnd > 0 ? fullText.slice(0, titleEnd).trim() : fullText.slice(0, 100).trim();
    const content = titleEnd > 0 ? fullText.slice(titleEnd + 1).trim() : '';

    sections.push({ title, content, parts: splitSubheadings(content) });
  }

  return sections;
}
