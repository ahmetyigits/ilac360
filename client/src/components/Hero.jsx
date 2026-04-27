import { Pill } from 'lucide-react';

export default function Hero() {
  return (
    <div className="text-center space-y-3 py-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent text-white shadow-sm">
        <Pill className="w-7 h-7" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
        ilac<span className="text-accent">360</span>
      </h1>
      <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
        Türkiye&apos;deki ilaçlar arasında etkileşim kontrolü, hastalığa göre arama
        ve etken madde bilgisi — tek noktadan, ücretsiz.
      </p>
    </div>
  );
}
