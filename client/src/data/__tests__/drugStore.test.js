import { describe, it, expect, beforeAll } from 'vitest';
import {
  setDrugsForTest,
  searchDrugs,
  getDrugByName,
  turkishLower,
  searchFold,
  isValidIngredient,
  cleanCategories,
} from '../drugStore.js';

const FIXTURE_DRUGS = [
  { ID: '1', Product_Name: 'PAROL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01', barcode: '8699522015469' },
  { ID: '2', Product_Name: 'PAROL JUNIOR SURUP', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01', barcode: '8699522000001' },
  { ID: '3', Product_Name: 'MAJEZIK 100 MG TABLET', Active_Ingredient: 'Flurbiprofen', ATC_code: 'M01AE09', barcode: '8699541000002' },
  { ID: '4', Product_Name: 'IBURAMIN COLD TABLET', Active_Ingredient: 'İbuprofen, Psödoefedrin', ATC_code: 'M01AE51', barcode: '8699541000003' },
  { ID: '5', Product_Name: 'İBUFEN 400 MG TABLET', Active_Ingredient: 'İbuprofen', ATC_code: 'M01AE01', barcode: '8699541000004' },
];

beforeAll(() => {
  setDrugsForTest(FIXTURE_DRUGS);
});

describe('turkishLower / searchFold', () => {
  it('Türkçe karakter tablosu', () => {
    expect(turkishLower('İSTANBUL')).toBe('istanbul');
    expect(turkishLower('ISPARTA')).toBe('ısparta');
    expect(turkishLower('ÇĞÖŞÜ')).toBe('çğöşü');
  });

  it('searchFold ı/i ayrımını arama için katlar', () => {
    expect(searchFold('ISPARTA')).toBe('isparta');
    expect(searchFold('İSTANBUL')).toBe('istanbul');
  });
});

describe('searchDrugs', () => {
  it('tam eşleşme > başlangıç > içerme sıralaması', () => {
    const results = searchDrugs('parol');
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].name.startsWith('PAROL')).toBe(true);
  });

  it('Latin büyük I ile yazılmış ürünleri bulur (IBURAMIN)', () => {
    const results = searchDrugs('iburamin');
    expect(results.some((r) => r.name.includes('IBURAMIN'))).toBe(true);
  });

  it('Türkçe İ ile yazılmış ürünleri bulur (İBUFEN)', () => {
    const results = searchDrugs('ibufen');
    expect(results.some((r) => r.name.includes('İBUFEN'))).toBe(true);
  });

  it('çok kelimeli sorguda tokenlar bitişik olmak zorunda değil (parol tablet)', () => {
    const results = searchDrugs('parol tablet');
    expect(results.some((r) => r.name === 'PAROL 500 MG TABLET')).toBe(true);
    // Şurup formu 'tablet' tokenını içermediği için gelmez
    expect(results.some((r) => r.name.includes('SURUP'))).toBe(false);
  });

  it('etken madde araması isim eşleşmesi yoksa devreye girer', () => {
    const results = searchDrugs('flurbiprofen');
    expect(results.some((r) => r.name.includes('MAJEZIK'))).toBe(true);
  });

  it('barkod araması rakamsal sorgu ile çalışır', () => {
    const results = searchDrugs('8699522015469');
    expect(results).toHaveLength(1);
    expect(results[0].name).toContain('PAROL 500');
  });

  it('2 karakterden kısa sorguda boş döner', () => {
    expect(searchDrugs('p')).toEqual([]);
    expect(searchDrugs('')).toEqual([]);
  });
});

describe('getDrugByName', () => {
  it('büyük/küçük harf farkına takılmaz', () => {
    expect(getDrugByName('parol 500 mg tablet')?.ID).toBe('1');
    expect(getDrugByName('PAROL 500 MG TABLET')?.ID).toBe('1');
  });
});

describe('isValidIngredient (Türkçe locale regresyonu)', () => {
  it('Türkçe büyük harfli placeholder değerleri geçersiz sayar', () => {
    // Eski kod plain toLowerCase kullandığı için "BİLİNMİYOR" geçerli sanılıyordu.
    expect(isValidIngredient('BİLİNMİYOR')).toBe(false);
    expect(isValidIngredient('Bilinmiyor')).toBe(false);
    expect(isValidIngredient('Etken maddesi bilgisi bulunamadı.')).toBe(false);
    expect(isValidIngredient('')).toBe(false);
  });

  it('gerçek etken maddeleri geçerli sayar', () => {
    expect(isValidIngredient('Parasetamol')).toBe(true);
  });
});

describe('cleanCategories', () => {
  it('boş, "Yok" ve yinelenen kategorileri temizler', () => {
    const drug = {
      Category_1: ' Ağrı Kesici ',
      Category_2: 'Yok',
      Category_3: '',
      Category_4: 'Antienflamatuar',
      Category_5: 'Antienflamatuar',
    };
    expect(cleanCategories(drug)).toEqual(['Ağrı Kesici', 'Antienflamatuar']);
  });
});
