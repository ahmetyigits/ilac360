// Gerçek üretilmiş veriyle uçtan uca motor testi: build-data çıktısını (manifest
// üzerinden) yükler ve motoru GERÇEK TİTCK kayıtlarıyla çalıştırır.
// CI'da build:data bu testlerden önce koşar; veri yoksa (yerel hızlı koşu) atlanır.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setDrugsForTest, searchDrugs } from '../drugStore.js';
import { setInteractionsForTest, analyzeInteractions } from '../interactionEngine.js';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'public', 'data');
const hasData = existsSync(join(DATA, 'manifest.json'));

function expand(entry) {
  const cats = entry.c || [];
  return {
    ID: entry.i,
    Product_Name: entry.n,
    Active_Ingredient: entry.a || '',
    ATC_code: entry.t || '0',
    barcode: entry.b || null,
    Category_1: cats[0] || '',
    Category_2: cats[1] || '',
    Category_3: cats[2] || '',
    Category_4: cats[3] || '',
    Category_5: cats[4] || '',
    _hasDescription: !!entry.h,
  };
}

describe.skipIf(!hasData)('gerçek veri entegrasyonu', () => {
  let index;

  beforeAll(() => {
    const manifest = JSON.parse(readFileSync(join(DATA, 'manifest.json'), 'utf-8'));
    const file = (logical) => JSON.parse(readFileSync(join(DATA, manifest.files[logical]), 'utf-8'));
    index = file('drugs-index.json');
    setDrugsForTest(index.map(expand));
    setInteractionsForTest(file('interactions.json'), file('ingredient-synonyms.json'));
  });

  const findByIngredient = (needle) =>
    index.find((e) => e.a && e.a.toLocaleLowerCase('tr').includes(needle))?.n;

  it('REGRESYON: gerçek sildenafil ürünü + nitrat tuzlu topikal ürün kritik uyarı ÜRETMEZ', () => {
    const sildenafil = findByIngredient('sildenafil');
    const topikalNitrat = index.find(
      (e) => e.a && /(mikonazol|izokonazol|ekonazol)\s+nitrat/i.test(e.a)
    )?.n;
    expect(sildenafil).toBeTruthy();
    expect(topikalNitrat).toBeTruthy();
    const { interactions } = analyzeInteractions([sildenafil, topikalNitrat]);
    expect(interactions[0].risk).not.toBe('critical');
    expect(interactions[0].risk).not.toBe('high');
  });

  it('gerçek sildenafil + nitrat (kalp ilacı) ürünleri kritik uyarı üretir', () => {
    const sildenafil = findByIngredient('sildenafil');
    // Veri setindeki gerçek yazımlar: "İsosorbid-5-mononitrat", "isosorbide
    // mononitrate", "Gliseril Trinitrat", "Nitrogliserin" — hepsi sinonim
    // tablosu üzerinden kurala bağlanmalı.
    const nitratlar = index
      .filter((e) => e.a && /(sorbid|nitrogliserin|gliseril trinitrat)/i.test(e.a))
      .map((e) => e.n);
    expect(sildenafil).toBeTruthy();
    expect(nitratlar.length).toBeGreaterThan(0);
    for (const nitrat of nitratlar.slice(0, 5)) {
      const { interactions } = analyzeInteractions([sildenafil, nitrat]);
      expect(interactions[0].risk, `${nitrat} kritik olmalıydı`).toBe('critical');
    }
  });

  it('iki gerçek parasetamol ürünü doz aşımı uyarısı üretir', () => {
    const results = searchDrugs('parol');
    const parol = results.find((r) => r.activeIngredient?.toLocaleLowerCase('tr') === 'parasetamol');
    const digerParasetamol = index.find(
      (e) => e.a && e.a.toLocaleLowerCase('tr') === 'parasetamol' && e.n !== parol?.name
    )?.n;
    expect(parol).toBeTruthy();
    expect(digerParasetamol).toBeTruthy();
    const { interactions } = analyzeInteractions([parol.name, digerParasetamol]);
    expect(interactions[0].risk).toBe('critical');
    expect(interactions[0].message).toContain('aynı etkin madde');
  });

  it('Latin-I ile yazılmış ürünler aranabilir (ASPIRIN)', () => {
    const results = searchDrugs('aspirin');
    expect(results.length).toBeGreaterThan(0);
  });
});
