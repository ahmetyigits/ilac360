import { describe, it, expect } from 'vitest';
import {
  getCategory,
  getAllCategories,
  checkCategoryInteraction,
} from '../categoryRules.js';

describe('getCategory — en uzun (en spesifik) prefiks kazanır', () => {
  it('lityum (N05AN) ANTIPSYCHOTIC değil LITHIUM döner', () => {
    expect(getCategory('N05AN01')).toBe('LITHIUM');
  });

  it('tetrasiklin (J01AA) jenerik ANTIBIOTIC değil TETRACYCLINE döner', () => {
    expect(getCategory('J01AA02')).toBe('TETRACYCLINE');
  });

  it('metoklopramid (A03FA) ANTISPASMODIC değil PROKINETIC döner', () => {
    expect(getCategory('A03FA01')).toBe('PROKINETIC');
  });

  it('boş/geçersiz ATC null döner', () => {
    expect(getCategory(null)).toBeNull();
    expect(getCategory('0')).toBeNull();
    expect(getCategory('Z99')).toBeNull();
  });
});

describe('getAllCategories — lityum guard', () => {
  it('N05AN hem N05A prefiksine uyar ama ANTIPSYCHOTIC elenmiş olmalı', () => {
    const cats = getAllCategories('N05AN01');
    expect(cats).toContain('LITHIUM');
    expect(cats).not.toContain('ANTIPSYCHOTIC');
  });
});

describe('checkCategoryInteraction — en yüksek riskli kural kazanır', () => {
  it('çok-kategorili taraf: STATIN (high) CCB (medium) kuralını maskeler, tersi değil', () => {
    // Kolşisin × [amlodipin+atorvastatin kombosu]: iterasyonda önce
    // COLCHICINE×CALCIUM_CHANNEL_BLOCKER (medium) bulunur; asıl ciddi olan
    // COLCHICINE×STATIN (high) raporlanmalı.
    const r = checkCategoryInteraction(['COLCHICINE'], ['CALCIUM_CHANNEL_BLOCKER', 'STATIN']);
    expect(r.risk).toBe('high');
    expect([r.matchedCat1, r.matchedCat2]).toContain('STATIN');
  });

  it('argüman sırası sonucu değiştirmez (simetri)', () => {
    const r = checkCategoryInteraction(['CALCIUM_CHANNEL_BLOCKER', 'STATIN'], ['COLCHICINE']);
    expect(r.risk).toBe('high');
  });

  it('eşleşme yoksa null döner', () => {
    expect(checkCategoryInteraction(['STATIN'], ['ANTIHISTAMINE'])).toBeNull();
  });

  it('aynı sınıftan iki SSRI kuralı tanımlı ve high', () => {
    const r = checkCategoryInteraction(['SSRI'], ['SSRI']);
    expect(r?.risk).toBe('high');
    expect(r.message).toContain('serotonin');
  });
});
