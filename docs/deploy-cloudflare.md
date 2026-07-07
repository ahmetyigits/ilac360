# Cloudflare Pages'a Geçiş Rehberi

Şu anki akış: `npm run build` → `dist/` klasörünü Hostinger'a elle yükleme.
Cloudflare Pages'a geçince her `git push` otomatik yayına dönüşür ve veriler
küresel CDN + Brotli sıkıştırmayla sunulur (ücretsiz katman yeterlidir).

## Adımlar (~15 dakika)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git** → `ahmetyigits/ilac360` deposunu seçin.
2. Build ayarları:
   - **Build command:** `npm ci --prefix client && node scripts/build-data.mjs && npm --prefix client run build`
   - **Build output directory:** `client/dist`
   - **Environment variables:** Node sürümü için `NODE_VERSION=22`
3. **Git LFS:** Pages ayarlarında LFS desteğini açın (Settings → Builds → "Git LFS" toggle) — 55 MB veri seti LFS'te olduğu için şart.
4. İlk deploy sonrası **Custom domain** olarak `ilac360.com`'u bağlayın (DNS Cloudflare'e taşınır veya CNAME verilir).
5. Cache başlıkları: hash'li dosyalar için `client/public/_headers` dosyası ekleyin (Pages `.htaccess` okumaz):

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/data/*
  Cache-Control: public, max-age=31536000, immutable
/data/manifest.json
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
```

6. Telemetri worker'ı da aynı hesapta barındırılabilir (bkz. [telemetry.md](telemetry.md)).

## Geçiş sonrası

- Hostinger'daki site, DNS değişene kadar çalışmaya devam eder — kesintisiz geçiş için önce Pages'ı `*.pages.dev` adresinde doğrulayın.
- `.htaccess` Hostinger'a özgüdür; Pages'ta `_headers` geçerlidir. İkisi bir arada zarar vermez.
- Deploy artık `git push` = yayın olduğundan, `dist/` klasörünü elle yükleme adımı tamamen kalkar.
