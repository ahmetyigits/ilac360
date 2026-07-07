import { Pill, ShieldCheck, Database, Lock } from 'lucide-react';

export default function Hero() {
  return (
    <div className="text-center space-y-4 py-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent text-white shadow-sm">
        <Pill className="w-7 h-7" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
        ilac<span className="text-accent">360</span>
      </h1>
      <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
        Kullandığınız ilaçlar birbirini etkiliyor mu? Türkiye'de ruhsatlı 20.000'den fazla
        ilaç arasında etkileşim kontrolü yapın, hastalığa göre ilaç arayın, prospektüs
        bilgilerine ulaşın.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Database className="w-3 h-3" /> TİTCK ürün verisi
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="w-3 h-3" /> Verileriniz cihazınızdan çıkmaz
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" /> Ücretsiz ve açık kaynak
        </span>
      </div>
    </div>
  );
}
