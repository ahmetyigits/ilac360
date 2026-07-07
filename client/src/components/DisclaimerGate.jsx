import { useEffect, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import { acknowledgeDisclaimer } from '../data/disclaimer.js';

// İlk analizden önce bir kez gösterilen onay kapısı: kullanıcı aracın tıbbi
// tavsiye olmadığını açıkça kabul etmeden analiz çalıştırılmaz.
export default function DisclaimerGate({ onAccept, onCancel }) {
  const acceptRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    acceptRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key === 'Tab') {
        // Küçük odak tuzağı: sekme yalnızca modal içindeki öğeler arasında dolaşır.
        const focusable = cardRef.current?.querySelectorAll('button');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const accept = () => {
    acknowledgeDisclaimer();
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-gate-title"
        className="bg-card rounded-xl border border-border max-w-md w-full p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 id="disclaimer-gate-title" className="text-sm font-semibold text-text-primary">
              Analize başlamadan önce
            </h2>
            <ul className="text-[12px] text-text-secondary mt-2 space-y-1.5 leading-relaxed list-disc pl-4">
              <li>Bu araç <strong>tıbbi tavsiye değildir</strong>; yalnızca bilgilendirme amaçlıdır.</li>
              <li>Sonuçlar doz, yaş, gebelik, böbrek/karaciğer fonksiyonu gibi hasta faktörlerini dikkate almaz.</li>
              <li>"Bilinmiyor" sonucu güvenli anlamına gelmez; veritabanımızda kural olmadığını gösterir.</li>
              <li>İlaç kullanımıyla ilgili her karar için doktorunuza veya eczacınıza danışın.</li>
            </ul>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-bg-primary transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            ref={acceptRef}
            onClick={accept}
            className="flex-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Anladım, devam et
          </button>
        </div>
      </div>
    </div>
  );
}
