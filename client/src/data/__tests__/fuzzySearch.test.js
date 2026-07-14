import { describe, it, expect, beforeAll } from 'vitest';
import { setDrugsForTest } from '../drugStore.js';
import { getSuggestions, resetFuzzyIndex, boundedLevenshtein } from '../fuzzySearch.js';

const FIXTURE_DRUGS = [
  { ID: '1', Product_Name: 'ASPIRIN 100 MG TABLET', Active_Ingredient: 'Asetilsalisilik Asit', ATC_code: 'N02BA01' },
  { ID: '2', Product_Name: 'ASPIRIN 500 MG TABLET', Active_Ingredient: 'Asetilsalisilik Asit', ATC_code: 'N02BA01' },
  { ID: '3', Product_Name: 'PAROL 500 MG TABLET', Active_Ingredient: 'Parasetamol', ATC_code: 'N02BE01' },
  { ID: '4', Product_Name: 'MAJEZIK 100 MG TABLET', Active_Ingredient: 'Flurbiprofen', ATC_code: 'M01AE09' },
];

beforeAll(() => {
  setDrugsForTest(FIXTURE_DRUGS);
  resetFuzzyIndex();
});

describe('boundedLevenshtein', () => {
  it('mesafeyi doğru hesaplar, eşik aşımında -1 döner', () => {
    expect(boundedLevenshtein('aspirn', 'aspirin', 2)).toBe(1);
    expect(boundedLevenshtein('parol', 'parol', 2)).toBe(0);
    expect(boundedLevenshtein('abc', 'xyz', 1)).toBe(-1);
  });
});

describe('getSuggestions', () => {
  it("yazım hatasında marka önerir: 'aspirn' → aspirin", () => {
    expect(getSuggestions('aspirn')).toContain('aspirin');
  });

  it("'parrol' → parol", () => {
    expect(getSuggestions('parrol')).toContain('parol');
  });

  it('çok kısa sorguda öneri üretmez', () => {
    expect(getSuggestions('ab')).toEqual([]);
    expect(getSuggestions('')).toEqual([]);
  });

  it('tam eşleşen token öneri olarak dönmez (mesafe 0 elenir)', () => {
    expect(getSuggestions('aspirin')).not.toContain('aspirin');
  });
});
