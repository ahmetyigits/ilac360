import { describe, it, expect } from 'vitest';
import { normalizeBarcode, extractGtinFromGs1, ean13ChecksumValid } from '../barcodeParse.js';

const GS = '\x1d';
// Geçerli checksum'lı örnek TR ilaç barkodu (8699536190124: son hane 4 = doğru)
const EAN = '8699546339181';

describe('ean13ChecksumValid', () => {
  it('gerçek TR barkod biçimini doğrular', () => {
    // 869954633918 + kontrol hanesi hesabı: geçerli/geçersiz ayrımı
    expect(ean13ChecksumValid(EAN)).toBe(true);
    expect(ean13ChecksumValid('8699546339182')).toBe(false);
    expect(ean13ChecksumValid('12345')).toBe(false);
  });
});

describe('normalizeBarcode — EAN', () => {
  it('EAN-13 olduğu gibi döner', () => {
    expect(normalizeBarcode(EAN, 'ean_13')).toBe(EAN);
  });
  it('EAN-8 kabul, çöp reddedilir', () => {
    expect(normalizeBarcode('12345670', 'ean_13')).toBe('12345670');
    expect(normalizeBarcode('ABC123', 'ean_13')).toBeNull();
    expect(normalizeBarcode('', 'ean_13')).toBeNull();
  });
});

describe('normalizeBarcode — İTS karekod (GS1 DataMatrix)', () => {
  const GTIN14 = `0${EAN}`; // İTS birim karekodu: gösterge 0 + EAN-13

  it(']d2 önekli tam İTS yükü: AI(01) → 13 hane', () => {
    const payload = `]d201${GTIN14}21ABC123XYZ${GS}17271200${GS}10LOT42`;
    expect(normalizeBarcode(payload, 'data_matrix')).toBe(EAN);
  });

  it('öneksiz yük ve farklı AI sırası', () => {
    const payload = `01${GTIN14}17271200${GS}21SERI01`;
    expect(normalizeBarcode(payload, 'data_matrix')).toBe(EAN);
  });

  it('AI(01) öncesinde değişken alan (GS ile biten seri)', () => {
    const payload = `21SERI999${GS}01${GTIN14}10LOT`;
    expect(normalizeBarcode(payload, 'data_matrix')).toBe(EAN);
  });

  it('seri içindeki "01" dizisi GTIN sanılmaz', () => {
    // 21 seri: "01" + 14 rakamla başlıyor ama GTIN değil — yürüyüş 21'i atlar
    const payload = `21${'01123456789012'}${GS}01${GTIN14}`;
    expect(normalizeBarcode(payload, 'data_matrix')).toBe(EAN);
  });

  it('gösterge ≠ 0 (koli GTIN-14) 14 hane olarak döner', () => {
    const payload = `01${'1' + EAN}`;
    expect(normalizeBarcode(payload, 'data_matrix')).toBe(`1${EAN}`);
  });

  it('bozuk checksum QR gürültüsü reddedilir', () => {
    const payload = `010${'8699546339182'}`; // checksum yanlış
    expect(normalizeBarcode(payload, 'data_matrix')).toBeNull();
  });

  it('GS1 olmayan QR (URL/metin) null döner', () => {
    expect(normalizeBarcode('https://ilac360.com/?d=1,2', 'qr_code')).toBeNull();
    expect(normalizeBarcode('MERHABA DÜNYA', 'qr_code')).toBeNull();
  });

  it('desteklenmeyen format null', () => {
    expect(normalizeBarcode(EAN, 'code_128')).toBeNull();
  });
});

describe('extractGtinFromGs1', () => {
  it(']Q3 öneki ve FNC1 başlangıcı ayıklanır', () => {
    expect(extractGtinFromGs1(`]Q3${GS}01${'0' + EAN}`)).toBe(`0${EAN}`);
  });
});
