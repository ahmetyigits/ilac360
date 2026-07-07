// Gizlilik-dostu, bağımlılıksız telemetri.
//
// İlke: çerez yok, kullanıcı kimliği yok, kişisel veri yok. Yalnızca iki sinyal:
//   1. Hata raporu  → VITE_ERROR_ENDPOINT     (mesaj + kısaltılmış stack + sayfa yolu)
//   2. Sayfa açılışı → VITE_ANALYTICS_ENDPOINT (yol + ekran sınıfı; günde kaç kişi giriyor sorusu için)
//
// İlgili env değişkeni tanımlı değilse o sinyal TAMAMEN kapalıdır — istek atılmaz.
// Uç nokta olarak ücretsiz bir Cloudflare Worker yeterlidir (bkz. docs/telemetry.md).

const ERROR_ENDPOINT = import.meta.env.VITE_ERROR_ENDPOINT || null;
const ANALYTICS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || null;

const MAX_ERRORS_PER_SESSION = 10;
let errorCount = 0;
const seenErrors = new Set();

function send(endpoint, payload) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  } catch {
    // Telemetri asla uygulamayı bozamaz.
  }
}

export function reportError(error, context = null) {
  if (!ERROR_ENDPOINT) return;
  if (errorCount >= MAX_ERRORS_PER_SESSION) return;
  const message = String(error?.message || error || 'unknown').slice(0, 300);
  const dedupeKey = message;
  if (seenErrors.has(dedupeKey)) return;
  seenErrors.add(dedupeKey);
  errorCount++;
  send(ERROR_ENDPOINT, {
    type: 'error',
    message,
    stack: String(error?.stack || '').slice(0, 1500),
    context: context ? String(context).slice(0, 200) : null,
    path: location.pathname,
    ua: navigator.userAgent.slice(0, 200),
    ts: new Date().toISOString(),
  });
}

function reportPageview() {
  if (!ANALYTICS_ENDPOINT) return;
  send(ANALYTICS_ENDPOINT, {
    type: 'pageview',
    path: location.pathname,
    // Kaba ekran sınıfı — cihaz dağılımını anlamak için yeterli, parmak izi için değil.
    screen: window.innerWidth < 640 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    lang: navigator.language,
    ts: new Date().toISOString(),
  });
}

export function initTelemetry() {
  if (!ERROR_ENDPOINT && !ANALYTICS_ENDPOINT) return;

  if (ERROR_ENDPOINT) {
    window.addEventListener('error', (e) => {
      reportError(e.error || e.message, 'window.onerror');
    });
    window.addEventListener('unhandledrejection', (e) => {
      reportError(e.reason, 'unhandledrejection');
    });
  }

  reportPageview();
}
