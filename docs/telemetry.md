# Telemetri: Hata İzleme + Gizlilik-Dostu Analitik

Uygulama, **çerezsiz ve kullanıcı kimliksiz** iki sinyal gönderebilir
([client/src/data/telemetry.js](../client/src/data/telemetry.js)):

| Sinyal | Env değişkeni | İçerik |
|---|---|---|
| Hata raporu | `VITE_ERROR_ENDPOINT` | hata mesajı, kısaltılmış stack, sayfa yolu, tarayıcı |
| Sayfa açılışı | `VITE_ANALYTICS_ENDPOINT` | yol, ekran sınıfı (mobile/tablet/desktop), dil |

Env değişkeni tanımlı değilse ilgili sinyal **tamamen kapalıdır** — hiçbir istek atılmaz.
Kişisel veri, çerez, kalıcı kimlik yoktur; oturum başına en fazla 10 hata raporu gönderilir.

## Kurulum

1. Aşağıdaki ücretsiz Cloudflare Worker'ı oluşturun (dash.cloudflare.com → Workers → Create):

```js
// telemetry-worker.js — gelen olayları KV'ye yazar (ücretsiz katman yeterli)
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('ok');
    let event;
    try { event = await request.json(); } catch { return new Response('bad', { status: 400 }); }
    if (!['error', 'pageview'].includes(event.type)) return new Response('bad', { status: 400 });

    const day = new Date().toISOString().slice(0, 10);
    if (event.type === 'pageview') {
      // Günlük sayaç (istatistik için yeterli)
      const key = `pv:${day}`;
      const current = parseInt((await env.TELEMETRY.get(key)) || '0', 10);
      await env.TELEMETRY.put(key, String(current + 1), { expirationTtl: 60 * 60 * 24 * 90 });
    } else {
      // Hata kayıtları: gün + rastgele sonek
      const key = `err:${day}:${crypto.randomUUID()}`;
      await env.TELEMETRY.put(key, JSON.stringify(event), { expirationTtl: 60 * 60 * 24 * 30 });
    }
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': 'https://ilac360.com' },
    });
  },
};
```

2. Worker'a bir **KV namespace** bağlayın (`TELEMETRY` adıyla).
3. Build ortamında değişkenleri tanımlayın (`client/.env.production` veya CI secret):

```
VITE_ERROR_ENDPOINT=https://telemetry.<hesabınız>.workers.dev/
VITE_ANALYTICS_ENDPOINT=https://telemetry.<hesabınız>.workers.dev/
```

4. `npm run build` — hepsi bu. Endpoint'ler tanımlı olmadan yapılan build'lerde telemetri kodu devre dışıdır.

## Okuma tarafı: mini operatör panosu

Aynı worker'a bir `GET` dalı ekleyin — gizli token ile günlük ziyaret sayaçları
ve son hataları tek HTML tabloda gösterir (SPA'ya dokunmadan):

```js
// fetch() içinde, POST kontrolünden ÖNCE:
if (request.method === 'GET') {
  const url = new URL(request.url);
  if (url.searchParams.get('token') !== env.DASH_TOKEN) return new Response('yok', { status: 404 });
  const pv = await env.TELEMETRY.list({ prefix: 'pv:' });
  const errs = await env.TELEMETRY.list({ prefix: 'err:', limit: 50 });
  let html = '<meta charset="utf-8"><h2>Günlük ziyaret</h2><table border=1 cellpadding=6>';
  for (const k of pv.keys.sort((a, b) => b.name.localeCompare(a.name)).slice(0, 30)) {
    html += `<tr><td>${k.name.slice(3)}</td><td>${await env.TELEMETRY.get(k.name)}</td></tr>`;
  }
  html += '</table><h2>Son hatalar</h2><pre>';
  for (const k of errs.keys.slice(-20)) {
    html += (await env.TELEMETRY.get(k.name)) + '\n\n';
  }
  return new Response(html + '</pre>', { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
}
```

Worker ayarlarında `DASH_TOKEN` adında gizli bir değişken tanımlayın; panoya
`https://telemetry.<hesap>.workers.dev/?token=<gizli>` ile erişin.

## Alternatifler

- **Sentry**: daha zengin hata izleme isterseniz `@sentry/react` ekleyip `main.jsx`'te init edin (DSN'i env'den okuyun). Paket boyutu ~25 KB gzip artar.
- **Plausible / GoatCounter**: hazır çerezsiz analitik; `client/index.html`'e script etiketi eklemek yeterli. GoatCounter ücretsizdir.
