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
   git add -A && git commit -m "Veri güncellemesi: 2026-08 TİTCK export'u"
   git push -u origin veri-2026-08
   ```
   CI (lint + kural linti + kapsam kapısı + smoke + 71 test) yeşilse merge edin.

6. **Yayınlayın:** `npm run build` → `dist/` içeriğini Hostinger'a yükleyin
   (`.htaccess` dahil). `manifest.json`'daki `generatedAt` yeni tarihi gösterir;
   Hakkında sayfası bunu otomatik yansıtır.

## Sorun giderme

- **"beklenmeyen şema"** — export phpMyAdmin JSON değil; doğru yöntemle alın.
- **Kapsam düştü** — 3. adımdaki sinonim akışı; asla eşiği düşürerek geçmeyin.
- **Geri alma** — `mv data/ilaclar-dataset.json.onceki data/ilaclar-dataset.json`
  ve `node scripts/build-data.mjs`.
