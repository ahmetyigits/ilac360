// Prospektüs bucket'lama — build (scripts/build-data.mjs) ve runtime (drugStore)
// aynı fonksiyonu kullanmak ZORUNDA; ayrışırlarsa ilaç kartı yanlış dosyaya bakar.

// 64 → 512: TİTCK KT genişlemesiyle (~12 bin prospektüs) 64 bucket'ta tek
// bucket ~3 MB'a çıkıyordu; 512 ile kart başına indirme ~350 KB'ta kalır.
export const BUCKET_COUNT = 512;

export function bucketOf(id) {
  const n = parseInt(id, 10);
  if (Number.isFinite(n)) return ((n % BUCKET_COUNT) + BUCKET_COUNT) % BUCKET_COUNT;
  // Rakamsal olmayan id için basit ve kararlı string hash
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return ((h % BUCKET_COUNT) + BUCKET_COUNT) % BUCKET_COUNT;
}
