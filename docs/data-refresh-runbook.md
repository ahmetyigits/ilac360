# Aylık Veri Yenileme Runbook'u

Hedef: TİTCK ürün verisini ayda bir güncellemek. Tek komut + insan onayı.
Toplam süre: ~15 dakika.

## Adımlar

1. **Yeni export'u alın** — TİTCK verisinin phpMyAdmin JSON export'u
   (üç elemanlı dizi; `[2].data` ilaç kayıtları). Dosyayı repo dışına indirin,
   ör. `~/Downloads/ilaclar-2026-08.json`.

2. **Rapor modunda çalıştırın:**
   ```bash
   node scripts/ingest-dataset.mjs ~/Downloads/ilaclar-2026-08.json
   ```
   Script sırasıyla: şemayı doğrular → eklenen/çıkan/değişen ürünleri listeler
   → kural kapsamı deltasını gösterir. Kapsam %95'in altına düşerse çıkış
   kodu 1 olur ve `--apply` reddedilir.

3. **Raporu okuyun.** Özellikle:
   - "Eşleşmeyi kaybeden kural tarafları" — yeni export'ta yazım değiştiyse
     `data/ingredient-synonyms.json`'a sinonim ekleyin, raporu tekrar çalıştırın.
   - Çıkan ürün sayısı anormal yüksekse (binlerce) export eksik olabilir; uygulamayın.

4. **Uygulayın:**
   ```bash
   git checkout -b veri-2026-08
   node scripts/ingest-dataset.mjs ~/Downloads/ilaclar-2026-08.json --apply
   ```
   Eski veri `data/ilaclar-dataset.json.onceki` olarak yedeklenir;
   build-data + smoke-test otomatik koşar.

5. **Testleri koşun ve PR açın:**
   ```bash
   npm --prefix client run test
   git add data/ && git commit -m "Veri güncellemesi: 2026-08 TİTCK export'u"
   git push -u origin veri-2026-08
   ```
   `git add -A` KULLANMAYIN: `--apply` yedeği (`*.onceki`, 55 MB) gitignore'da
   ama benzer artıkların yanlışlıkla commit'lenmesi depo geçmişini kalıcı şişirir.
   CI (lint + kural linti + kapsam kapısı + smoke + testler) yeşilse merge edin;
   merge sonrası sürümü etiketleyin: `git tag data-2026-08 && git push --tags`.

6. **Yayınlayın:** `npm run build` → `dist/` içeriğini Hostinger'a yükleyin.
   Build, Drive senkronunun " 2" kopya artıklarını otomatik ayıklar
   (`scripts/copy-dist.mjs`); yine de yüklemeden önce `dist/` içinde
   `* 2.*` adlı dosya olmadığını kontrol edin.

   **Yükleme SIRASI önemlidir** (elle yükleme atomik değildir; yanlış sırada
   siteye o anda giren kullanıcı bozuk sayfa görür):
   1. Önce YENİ içerik-hash'li dosyalar: `assets/` ve `data/` klasörleri.
   2. Sonra diğer kök dosyalar (`.htaccess` dahil — gizli dosyaları göster).
   3. **En son** `index.html`, `sw.js`, `manifest.webmanifest`, `manifest.json`.
   4. Eski hash'li dosyaları hemen silmeyin; bir sonraki yenilemede silin
      (açık sekmelerdeki eski sürümler onlara başvuruyor olabilir).

   Doğrulama: `https://ilac360.com/data/manifest.json` 200 dönmeli ve
   `generatedAt` yeni tarihi göstermeli; Hakkında sayfası bunu otomatik yansıtır.

## TİTCK prospektüs (KT) kapsamını genişletme (opsiyonel, aylık)

Şu an ürünlerin ~%40'ında bağlı prospektüs (KT) var; kalanına `getDescription`
TİTCK'ye yönlendirir. Kapsamı artırmak için (ayda bir, veri yenilemeyle birlikte):

1. `node scripts/titck-sync.mjs` — resumable; titck.gov.tr/kubkt'ten yeni
   barkodlar için KT çeker (PDF→metin), `data/titck-kt-texts.json` +
   `data/titck-kt-map.json`'a ekler. CAPTCHA/ağ nedeniyle yarı-otomatiktir;
   süre öngörülemez, kaldığı yerden devam eder.
2. `node scripts/titck-merge-desc.mjs` build sırasında bağlar (dataset'e
   KOPYALAMAZ; LFS küçük kalsın diye barkod-anahtarlı eşleme kullanır).
3. Kapsam kontrolü: eşleşen barkod / toplam ürün oranı. Hedef kademeli: %40→%60+.

Bu bir **veri operasyonudur**, kod değişikliği değildir; kapsam kapısına dahil
değildir (ağ bağımlı). Toplu çekim OLANAKSIZ (tescilli framework + CAPTCHA);
yalnız kademeli, barkod-anahtarlı kürasyon.

## Sorun giderme

- **"beklenmeyen şema"** — export phpMyAdmin JSON değil; doğru yöntemle alın.
- **Kapsam düştü** — 3. adımdaki sinonim akışı; asla eşiği düşürerek geçmeyin.
- **Geri alma** — `mv data/ilaclar-dataset.json.onceki data/ilaclar-dataset.json`
  ve `node scripts/build-data.mjs`.
