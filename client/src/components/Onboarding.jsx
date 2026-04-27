import { useState, useEffect } from 'react';
import { X, ArrowRight, Search, Stethoscope, Barcode, FlaskConical } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'İlaç Arayın',
    desc: 'Kullandığınız ilacın adını veya etken maddesini yazın. Türkiye\'deki 20.000+ ilaç arasından arar. Ctrl+K ile arama kutusuna hızla odaklanabilirsiniz.',
  },
  {
    icon: Stethoscope,
    title: 'Hastalığa Göre Bulun',
    desc: '"Hastalığa Göre Ara" sekmesinde "baş ağrısı", "mide ülseri", "vertigo" gibi şikayetinizi yazarak o duruma uygun ilaçları görün.',
  },
  {
    icon: Barcode,
    title: 'Barkod ile Arama',
    desc: 'İlaç kutusunun üzerindeki 13 haneli barkodu doğrudan arama kutusuna yazarak ilacı bulun.',
  },
  {
    icon: FlaskConical,
    title: 'Etkileşim Analizi',
    desc: 'En az 2 ilaç seçtikten sonra "Analiz Et" butonuna tıklayın. Etkin madde çakışması, ATC grup eşleşmesi ve bilinen kuralları tarar.',
  },
];

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('onboarding_done')) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('onboarding_done', 'true');
  };

  if (!visible) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-[420px] max-w-[90vw] overflow-hidden animate-slide-up">
        {/* Progress */}
        <div className="flex gap-1 px-6 pt-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-accent' : 'bg-border'}`}
            />
          ))}
        </div>

        <div className="p-6 pt-5">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-accent" />
          </div>
          <h3 className="text-base font-semibold text-text-primary">{current.title}</h3>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">{current.desc}</p>
        </div>

        <div className="px-6 pb-5 flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          >
            Atla
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-bg-primary transition-all cursor-pointer"
              >
                Geri
              </button>
            )}
            <button
              onClick={() => (isLast ? dismiss() : setStep((p) => p + 1))}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-all cursor-pointer"
            >
              {isLast ? 'Başla' : 'İleri'}
              {!isLast && <ArrowRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
