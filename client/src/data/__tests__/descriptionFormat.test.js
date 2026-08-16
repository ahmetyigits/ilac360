import { describe, it, expect } from 'vitest';
import {
  normalizeDescription,
  parseDescription,
  splitSubheadings,
  isSubheadingLine,
} from '../descriptionFormat.js';

// Fikstürler gerçek dataset örüntülerinden türetildi (DOPADEX, DOSTINEX vb.):
// \x95 Windows-1252 madde imi, "madde:Her" iki nokta bitişiği,
// "TalimatıKULLANMA" küçük→BÜYÜK, "DOSTINEXnedir" BÜYÜK→küçük yapışıkları.

describe('normalizeDescription — yapışıklar', () => {
  it('iki nokta bitişiğini ayırır, saati bozmaz', () => {
    expect(normalizeDescription('Etkin madde:Her film kaplı tablet')).toBe('Etkin madde: Her film kaplı tablet');
    expect(normalizeDescription('Sabah 08:30 ve 20:30 saatlerinde alın.')).toContain('08:30');
  });

  it('küçük→BÜYÜK yapışığını ayırır', () => {
    expect(normalizeDescription('Kullanma TalimatıKULLANMA TALİMATI')).toBe('Kullanma Talimatı KULLANMA TALİMATI');
  });

  it('BÜYÜK marka adı + küçük kelime yapışığını ayırır', () => {
    expect(normalizeDescription('DOSTINEXnedir ve ne için kullanılır?')).toBe('DOSTINEX nedir ve ne için kullanılır?');
    expect(normalizeDescription('DOMIRPAalmayınız')).toBe('DOMIRPA almayınız');
  });

  it('BÜYÜK dizisi + Başlık yapışığını ayırır', () => {
    expect(normalizeDescription('KULLANMAYINIZAşağıdaki durumlarda')).toBe('KULLANMAYINIZ Aşağıdaki durumlarda');
  });

  it('bitişik numaralı başlığı ayırır: "2.DİKKAT" → "2. DİKKAT"', () => {
    expect(normalizeDescription('2.DİKKAT EDİLMESİ GEREKENLER')).toBe('2. DİKKAT EDİLMESİ GEREKENLER');
  });

  it('\\x95 madde imini satır başı + • yapar', () => {
    const out = normalizeDescription('içerir.\x95Bu kullanma talimatını saklayınız.\x95Eğer sorunuz olursa danışınız.');
    expect(out).toContain('\n• Bu kullanma talimatını saklayınız.');
    expect(out).toContain('\n• Eğer sorunuz olursa danışınız.');
  });

  it('Windows-1252 tırnak/çizgi karakterlerini düzeltir', () => {
    expect(normalizeDescription('ilac\x92n \x93etkisi\x94 \x96 dikkat')).toBe('ilac’n "etkisi" – dikkat');
  });
});

describe('parseDescription — bölümleme', () => {
  const KT = [
    'Dopadex Kullanma TalimatıKULLANMA TALİMATI',
    '1.DOPADEX nedir ve ne için kullanılır?',
    'DOPADEX, parkinson tedavisinde kullanılan bir ilaçtır. Tabletler ağızdan alınır ve doktorunuzun önerdiği şekilde kullanılır. Etkin madde:Her tablet 25 mg etkin madde içerir.',
    '2.DİKKAT EDİLMESİ GEREKENLER',
    'DOPADEX\x92i aşağıdaki durumlarda KULLANMAYINIZ',
    'Eğer etkin maddeye karşı alerjiniz varsa kullanmayınız. Dar açılı glokomunuz varsa kullanmayınız.',
    'Hamilelik',
    'İlacı kullanmadan önce doktorunuza danışınız. Gebelikte kullanımına doktor karar verir.',
    'Araç ve makine kullanımı',
    'Uyku hali yapabilir; araç kullanmayınız.',
    '3.DOPADEX nasıl kullanılır?',
    'Doktorunuzun önerdiği dozda kullanınız. Tabletleri bir bardak su ile yutunuz. Doz atlamayınız ve iki dozu birden almayınız.',
    '4.Olası yan etkiler nelerdir?',
    'Tüm ilaçlar gibi DOPADEX de yan etkilere yol açabilir. Yaygın yan etkiler arasında bulantı yer alır.',
    '5.DOPADEX\x92in saklanması',
    'Çocukların göremeyeceği yerde saklayınız. 25 derecenin altında oda sıcaklığında saklayınız.',
  ].join('\n');

  it('bitişik numaralı başlıklı KT 5 bölüme ayrılır', () => {
    const sections = parseDescription(KT);
    const titled = sections.filter((s) => s.title);
    expect(titled.length).toBe(5);
    expect(titled[0].title).toMatch(/^1\./);
    expect(titled[1].title).toMatch(/DİKKAT EDİLMESİ/);
  });

  it('bölüm 2 içinde alt başlıklar ayrışır (KULLANMAYINIZ, Hamilelik, Araç)', () => {
    const sections = parseDescription(KT);
    const dikkat = sections.find((s) => s.title && s.title.includes('DİKKAT'));
    const subs = dikkat.parts.map((p) => p.subheading).filter(Boolean);
    expect(subs.some((s) => s.endsWith('KULLANMAYINIZ'))).toBe(true);
    expect(subs).toContain('Hamilelik');
    expect(subs).toContain('Araç ve makine kullanımı');
  });

  it('bölümsüz kısa metin tek parça döner', () => {
    const sections = parseDescription('Kısa bir açıklama metni. Bölüm başlığı yok.');
    expect(sections.length).toBe(1);
    expect(sections[0].title).toBeNull();
  });

  it('boş/placeholder metin null döner', () => {
    expect(parseDescription('')).toBeNull();
    expect(parseDescription('İkinci siteye ait içerik bulunamadı')).toBeNull();
  });
});

describe('splitSubheadings', () => {
  it('alt başlık yoksa tek parça', () => {
    const parts = splitSubheadings('Sadece düz bir paragraf.\nİkinci satır.');
    expect(parts.length).toBe(1);
    expect(parts[0].subheading).toBeNull();
  });

  it('madde imli satırlar alt başlık sayılmaz', () => {
    expect(isSubheadingLine('• Hamilelik döneminde doktora danışın')).toBe(false);
  });

  it('standart KT alt başlıkları tanınır', () => {
    expect(isSubheadingLine('Yiyecek ve içecek ile kullanılması')).toBe(true);
    expect(isSubheadingLine('Kullanmanız gerekenden daha fazla DOPADEX kullandıysanız')).toBe(true);
    expect(isSubheadingLine('DOPADEX kullanmayı unutursanız')).toBe(true);
    expect(isSubheadingLine('Uzun bir düz cümle alt başlık değildir çünkü şablonda yoktur')).toBe(false);
  });
});
