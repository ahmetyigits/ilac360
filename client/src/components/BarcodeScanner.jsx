import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Flashlight, Loader2, CameraOff } from 'lucide-react';
import { createDetector } from '../data/barcodeDetector.js';
import { normalizeBarcode } from '../data/barcodeParse.js';

// Tam ekran barkod/karekod tarama modalı. İçinde ilaç mantığı YOKTUR:
// çözülen rakam dizisini onDetected(digits) ile geri verir; arama/ekleme
// DrugSearch'te yaşar. Kamera akışı her kapanış yolunda durdurulur.
export default function BarcodeScanner({ onDetected, onClose }) {
  const [phase, setPhase] = useState('starting'); // starting | scanning | error
  const [errorKind, setErrorKind] = useState(null); // permission | no_camera | detector
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const aliveRef = useRef(true);
  const detectedRef = useRef(false);
  const panelRef = useRef(null);

  const teardown = useCallback(() => {
    aliveRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const close = useCallback(() => {
    teardown();
    onClose();
  }, [teardown, onClose]);

  const start = useCallback(async () => {
    aliveRef.current = true;
    detectedRef.current = false;
    setPhase('starting');
    setErrorKind(null);
    try {
      const [stream, detector] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        }),
        createDetector(),
      ]);
      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setTorchAvailable(!!stream.getVideoTracks()[0]?.getCapabilities?.()?.torch);
      setPhase('scanning');

      // Tarama döngüsü: rAF değil — 60fps decode pil yakar; detect await'i
      // bitmeden yenisi başlamaz (yavaş telefonda üst üste binme olmaz).
      const loop = async () => {
        if (!aliveRef.current || detectedRef.current) return;
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video);
            for (const code of codes) {
              const digits = normalizeBarcode(code.rawValue, code.format);
              if (digits) {
                detectedRef.current = true;
                navigator.vibrate?.(35);
                teardown();
                onDetected(digits);
                return;
              }
            }
          }
        } catch {
          // tek karedeki decode hatası döngüyü öldürmez
        }
        if (aliveRef.current) setTimeout(loop, 150);
      };
      loop();
    } catch (err) {
      if (!aliveRef.current) return;
      teardown();
      aliveRef.current = true; // hata ekranı açık; "Tekrar dene" çalışabilsin
      setErrorKind(
        err?.name === 'NotAllowedError' ? 'permission'
          : err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError' ? 'no_camera'
            : 'detector'
      );
      setPhase('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    start();
    return teardown;
  }, [start, teardown]);

  // Escape ile kapat + odağı modala taşı
  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((t) => !t);
    } catch {
      // bazı cihazlar yeteneği bildirse de reddediyor — sessiz geç
    }
  };

  const ERROR_COPY = {
    permission: 'Kamera izni verilmedi. Tarayıcı ayarlarından ilac360 için kamera iznine izin verip tekrar deneyin.',
    no_camera: 'Bu cihazda kullanılabilir bir kamera bulunamadı. Barkodu arama kutusuna elle yazabilirsiniz.',
    detector: 'Barkod tarayıcı başlatılamadı. İnternet bağlantınızı kontrol edin veya barkodu elle yazın.',
  };

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Barkod tarayıcı"
      className="fixed inset-0 z-[110] bg-black flex items-center justify-center outline-none"
    >
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

      {/* Hedef çerçevesi + karartma */}
      {phase === 'scanning' && (
        <div className="relative z-10 pointer-events-none">
          <div className="w-[72vw] max-w-[420px] h-[38vw] max-h-[230px] rounded-2xl border-2 border-white/90 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
          <p className="text-white/95 text-center text-[14px] font-medium mt-4 drop-shadow">
            Barkodu veya karekodu çerçeveye hizalayın
          </p>
        </div>
      )}

      {phase === 'starting' && (
        <div className="relative z-10 flex flex-col items-center gap-3 text-white">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-[14px]">Kamera açılıyor…</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="relative z-10 max-w-sm mx-6 bg-card rounded-[18px] p-6 text-center space-y-4">
          <CameraOff className="w-8 h-8 mx-auto text-text-muted" />
          <p className="text-[14px] text-text-secondary leading-relaxed">{ERROR_COPY[errorKind]}</p>
          <div className="flex gap-3 justify-center">
            {(errorKind === 'permission' || errorKind === 'detector') && (
              <button
                onClick={start}
                className="px-4 py-2.5 bg-accent text-white rounded-[11px] text-sm font-semibold hover:bg-accent-deep transition-colors cursor-pointer"
              >
                Tekrar dene
              </button>
            )}
            <button
              onClick={close}
              className="px-4 py-2.5 border border-border rounded-[11px] text-sm font-semibold text-text-primary hover:bg-bg-primary transition-colors cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      <span aria-live="polite" className="sr-only">
        {phase === 'starting' ? 'Kamera açılıyor' : phase === 'scanning' ? 'Tarama sürüyor' : 'Kamera hatası'}
      </span>

      {/* Üst kontroller */}
      <button
        onClick={close}
        aria-label="Taramayı kapat"
        className="absolute top-5 right-5 z-20 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
      {torchAvailable && phase === 'scanning' && (
        <button
          onClick={toggleTorch}
          aria-label={torchOn ? 'Feneri kapat' : 'Feneri aç'}
          aria-pressed={torchOn}
          className={`absolute top-5 left-5 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            torchOn ? 'bg-white text-black' : 'bg-black/50 text-white hover:bg-black/70'
          }`}
        >
          <Flashlight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
