# Hostinger'a Yayın Runbook'u

İlaç 360 statik bir SPA'dır; Hostinger'da (LiteSpeed) `dist/` içeriğini sunmak
yeterlidir. İki yol var: **elle** (varsayılan, atomik kontrol) ve **otomatik**
(GitHub Actions, opsiyonel). Cloudflare alternatifi için [deploy-cloudflare.md](deploy-cloudflare.md).

## 0. Derle

```bash
npm run build     # build:data + client build + copy-dist (dist/ üretir)
```

`npm run build`, Drive senkronunun `" 2"` kopya artıklarını `copy-dist.mjs` ile
otomatik ayıklar. Yine de yüklemeden önce kontrol edin:

```bash
find dist -name '* [0-9].*'   # boş dönmeli
```

CI zaten yeşilse (`dist` artifact'ı) onu da indirebilirsiniz.

## 1. Elle yükleme (varsayılan)

Hostinger **File Manager** veya FTP (FileZilla) ile `dist/` içeriğini
`public_html/`'e yükleyin. **SIRA önemlidir** — elle yükleme atomik değildir;
yanlış sırada o an siteye giren kullanıcı bozuk sayfa görür:

1. Önce YENİ içerik-hash'li dosyalar: `assets/` ve `data/` klasörleri.
2. Sonra diğer kök dosyalar — **`.htaccess` dahil** (gizli dosyaları gösterin).
3. **En son** `index.html`, `sw.js`, `manifest.webmanifest`, `manifest.json`.
4. Eski hash'li dosyaları HEMEN silmeyin; bir sonraki yenilemede silin
   (açık sekmelerdeki eski sürümler onlara başvuruyor olabilir).

### `.htaccess` (dist içinde gelir)
gzip (DEFLATE), hash'li `*.<8hex>.json` için 1 yıl immutable cache,
`index.html`/manifest/`sw.js` için `no-cache`, SPA rewrite → `index.html`,
`X-Content-Type-Options: nosniff`. LiteSpeed için ayarlıdır; değiştirmeyin.

## 2. Otomatik yükleme (opsiyonel — GitHub Actions)

`.github/workflows/deploy.yml` **elle tetiklenir** (Actions sekmesi → "Deploy
(manual)" → Run workflow). Her push'ta otomatik deploy bilinçli olarak KAPALIDIR.

Gerekli **Secrets** (Settings → Secrets and variables → Actions):

| Secret | Örnek |
|---|---|
| `FTP_SERVER` | `ftp.ilac360.com` |
| `FTP_USERNAME` | FTP kullanıcı adı |
| `FTP_PASSWORD` | FTP parolası |
| `FTP_SERVER_DIR` | `/public_html/` |

Secret'lar tanımlı değilse workflow yalnız derler, yükleme adımını atlar (yeşil
kalır). Workflow tüm kalite kapılarını (build-data, smoke, lint, kapsam) çalıştırır;
kırıksa yüklemez.

> Not: FTP-sync dosya-diff'ine göre yükler; §1'deki katı sıra garanti edilmez.
> Hash'li + immutable cache sayesinde pencere kısadır, ama kritik sürümlerde elle
> yükleme daha güvenlidir.

## 3. Doğrulama

- `https://ilac360.com/data/manifest.json` → 200 ve `generatedAt` yeni tarih.
- Hakkında sayfası `generatedAt`'i otomatik yansıtır.
- Sert yenileme (Cmd/Ctrl+Shift+R) ile arama + bir analiz deneyin.

## Sorun giderme

- **Eski sürüm görünüyor** — `sw.js`/`index.html` `no-cache` mi? Tarayıcı
  önbelleğini + service worker'ı temizleyin (DevTools → Application).
- **404 / boş sayfa** — `.htaccess` yüklendi mi (SPA rewrite)? Gizli dosyalar.
- **`" 2"` artıkları yüklendi** — repo Drive/iCloud senkron yolunda; kalıcı çözüm
  repoyu senkron dışına taşımaktır (bkz. proje notları).
