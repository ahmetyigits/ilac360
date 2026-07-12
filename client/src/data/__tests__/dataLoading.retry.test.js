// Yükleyicilerin promise-reset davranışı: geçici bir ağ hatası KALICI olarak
// memoize edilmemeli; ikinci çağrı (Tekrar dene) gerçekten yeniden denemeli.
// Modül-düzeyi state nedeniyle her senaryo taze import ister (vi.resetModules).

import { describe, it, expect, beforeEach, vi } from 'vitest';

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

const MINI_INDEX = [
  { i: '1', n: 'PAROL 500 MG TABLET', a: 'parasetamol', t: 'N02BE01', b: null, c: [], h: false, f: 'sistemik' },
];

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('promise-reset (ölü retry düzeltmesi)', () => {
  it('loadDrugs: ilk fetch reddedilir, ikinci çağrı yeniden dener ve başarır', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('manifest.json')) return okJson({ files: {} });
      call++;
      if (call === 1) throw new TypeError('network down');
      return okJson(MINI_INDEX);
    }));
    const { loadDrugs } = await import('../drugStore.js');

    await expect(loadDrugs()).rejects.toThrow('network down');
    const drugs = await loadDrugs();
    expect(drugs).toHaveLength(1);
    expect(drugs[0].Product_Name).toBe('PAROL 500 MG TABLET');
  });

  it('loadManifest: ağ hatası kalıcı cache edilmez; ağ dönünce manifest okunur', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      call++;
      if (call === 1) throw new TypeError('offline');
      return okJson({ files: { 'drugs-index.json': 'drugs-index.abc123.json' } });
    }));
    const { loadManifest, dataUrl } = await import('../drugStore.js');

    expect(await loadManifest()).toBeNull(); // hata anında null'a düşer
    // ...ama sıradaki çağrı yeniden dener ve hash'li adı çözer
    const url = await dataUrl('drugs-index.json');
    expect(url).toContain('drugs-index.abc123.json');
  });

  it('loadManifest: temiz 404 (manifestsiz eski dağıtım) kalıcı olarak hashsiz ada düşer', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    const { dataUrl } = await import('../drugStore.js');

    expect(await dataUrl('drugs-index.json')).toContain('/drugs-index.json');
    await dataUrl('drugs-index.json');
    // 404 memoize edilir: manifest yalnızca bir kez istenir
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('bootData: başarısız birleşim sıfırlanır; Tekrar dene eksikleri yeniden çeker', async () => {
    let failInteractions = true;
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('manifest.json')) return okJson({ files: {} });
      if (u.includes('drugs-index')) return okJson(MINI_INDEX);
      if (u.includes('interactions.json')) {
        if (failInteractions) throw new TypeError('flaky');
        return okJson([]);
      }
      return okJson(u.includes('condition-mapping') ? [] : {});
    }));
    const { bootData } = await import('../api.js');

    await expect(bootData()).rejects.toThrow('flaky');
    failInteractions = false;
    await expect(bootData()).resolves.toBeTruthy();
  });
});
