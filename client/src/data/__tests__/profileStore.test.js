import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getProfile, setProfile, clearProfile, normalizeProfile } from '../profileStore.js';

beforeAll(() => {
  // Node'un deneysel global localStorage'ı eksik API sunabiliyor; temiz polyfill.
  let store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
});

beforeEach(() => localStorage.clear());

describe('profileStore', () => {
  it('boş başlangıç → tüm alanlar null/false', () => {
    const p = getProfile();
    expect(p).toEqual({ sex: null, ageBand: null, pregnant: false, breastfeeding: false });
  });

  it('kaydet + oku çalışır', () => {
    setProfile({ sex: 'k', ageBand: 'yasli', pregnant: true, breastfeeding: false });
    const p = getProfile();
    expect(p.sex).toBe('k');
    expect(p.ageBand).toBe('yasli');
    expect(p.pregnant).toBe(true);
  });

  it('gebe/emziren yalnız kadında saklanır (erkekte sıfırlanır)', () => {
    const p = normalizeProfile({ sex: 'e', pregnant: true, breastfeeding: true });
    expect(p.pregnant).toBe(false);
    expect(p.breastfeeding).toBe(false);
  });

  it('geçersiz değerler elenir', () => {
    const p = normalizeProfile({ sex: 'x', ageBand: 'zzz' });
    expect(p.sex).toBe(null);
    expect(p.ageBand).toBe(null);
  });

  it('temizle sıfırlar', () => {
    setProfile({ sex: 'k', ageBand: 'cocuk' });
    clearProfile();
    expect(getProfile().sex).toBe(null);
  });
});
