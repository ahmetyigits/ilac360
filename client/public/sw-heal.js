// Tek seferlik otomatik iyileştirme — service worker'a importScripts ile eklenir.
//
// Sorun: kırık bir dağıtım sırasında veri URL'lerine SPA fallback (index.html)
// 200 olarak dönebiliyordu; CacheFirst stratejisi bu bozuk HTML'i JSON dosyasının
// adına KALICI önbelleğe alıyordu. Sonrasında o ziyaretçilerde normal açılış eski
// bozuk yanıtı servis edip uygulamayı kilitliyor (hard refresh dışında).
//
// Çözüm: yeni SW aktive olduğunda (a) eski/zehirli veri önbelleklerini sil,
// (b) halihazırda bozuk içerikte takılı kalmış açık pencereleri yeniden yükle.
// Service worker kendini otomatik güncellediği için (skipWaiting + clientsClaim),
// bu iyileştirme etkilenen kullanıcılar HİÇBİR ŞEY YAPMADAN, siteyi bir sonraki
// açışlarında kendiliğinden gerçekleşir.

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Eski cacheName sürümleri (v1 = adsız, v2). Güncel sürüm v3 kullanır.
    const STALE = [
      'ilac360-data',
      'ilac360-data-v2',
      'ilac360-data-manifest',
      'ilac360-data-manifest-v2',
    ];
    const keys = await caches.keys();
    const found = keys.filter((k) => STALE.includes(k));
    await Promise.all(found.map((k) => caches.delete(k)));

    try { await self.clients.claim(); } catch { /* yoksay */ }

    // Yalnız zehirli eski önbellek varsa reload et (etkilenmiş dönen ziyaretçi).
    // Temiz/yeni kurulumda gereksiz reload yapma.
    if (found.length === 0) return;
    const wins = await self.clients.matchAll({ type: 'window' });
    await Promise.all(
      wins.map((c) => ('navigate' in c ? c.navigate(c.url).catch(() => {}) : null)),
    );
  })());
});
