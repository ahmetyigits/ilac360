// Barkod dedektör seçimi — tek dinamik-import noktası.
// Native BarcodeDetector (Android/Chromium) yeterliyse o; değilse (iPhone
// Safari, Firefox, data_matrix desteği eksik masaüstü Chrome) zxing-wasm
// tabanlı ponyfill dinamik import edilir: ilk bundle'a 0 bayt, WASM yalnız
// tarayıcı açılınca ve yerel asset'ten (?url — CDN yok) iner.

// Vite, wasm dosyasını content-hash'li asset olarak dist/assets'e kopyalar.
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

const FORMATS = ['ean_13', 'data_matrix', 'qr_code'];

let detectorPromise = null;

export function isScanSupported() {
  // getUserMedia yalnız güvenli bağlamda (HTTPS/localhost) tanımlı olduğundan
  // ayrı isSecureContext kontrolü gereksiz; onu kaldırmak, isSecureContext'in
  // yanlış false döndüğü nadir mobil durumlarda düğmenin gizlenmesini önler.
  return typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia;
}

export function createDetector() {
  if (detectorPromise) return detectorPromise;
  detectorPromise = (async () => {
    if ('BarcodeDetector' in window) {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        if (FORMATS.every((f) => supported.includes(f))) {
          return new window.BarcodeDetector({ formats: FORMATS });
        }
      } catch {
        // getSupportedFormats patlarsa ponyfill'e düş
      }
    }
    const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
    prepareZXingModule({
      overrides: {
        locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
      },
    });
    return new BarcodeDetector({ formats: FORMATS });
  })().catch((err) => {
    // Başarısız kurulum memoize edilmesin; tekrar dene çalışsın
    detectorPromise = null;
    throw err;
  });
  return detectorPromise;
}
