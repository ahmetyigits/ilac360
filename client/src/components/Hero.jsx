import { Search, Scan, FileText, Database, Lock, Github, BadgeCheck } from 'lucide-react';

// 3A landing: yüzen cam şekiller + güçlü display sans başlık + odak arama kartı,
// altında özellik kolonları, koyu "Hastalığa Göre" bandı ve sayısız güven şeridi.
// Arama bileşeni (children) odak kartın içine gömülür.

export default function Hero({ onConditionMode, children }) {
  return (
    <>
      {/* HERO */}
      <section className="relative w-full overflow-hidden">
        {/* Cam görünümlü yüzen şekiller (dekoratif) */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-[60px] left-[6%] w-24 h-24 rounded-full animate-floaty-slow pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 32% 28%,#C6DAF2,#7FA6D6 60%,#3E6BA8)',
            boxShadow: '0 30px 50px -20px rgba(37,99,168,.55), inset -10px -14px 26px rgba(20,45,80,.4), inset 8px 8px 18px rgba(255,255,255,.6)',
          }}
        />
        <div aria-hidden="true" className="hidden md:block absolute top-[120px] right-[7%] animate-floaty pointer-events-none">
          <div
            className="relative w-[132px] h-[50px] rounded-[25px] -rotate-[22deg]"
            style={{
              background:
                'linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0) 46%,rgba(0,0,0,.12)), linear-gradient(90deg,#2563A8 0 50%,#E7EEF8 50% 100%)',
              boxShadow: '0 26px 42px -18px rgba(37,99,168,.55), inset 0 2px 3px rgba(255,255,255,.6)',
            }}
          >
            <div className="absolute left-1/2 top-[12%] w-[2px] h-[76%] bg-black/10 -translate-x-px" />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="hidden md:block absolute bottom-[60px] right-[12%] w-[60px] h-[60px] rounded-full animate-floaty pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 34% 30%,#D6EDF7,#8FCBE6 62%,#4E9AC0)',
            boxShadow: '0 22px 36px -16px rgba(78,154,192,.5), inset -8px -10px 18px rgba(30,80,110,.35), inset 6px 6px 14px rgba(255,255,255,.6)',
          }}
        />

        <div className="relative z-[2] max-w-[900px] mx-auto text-center px-5 sm:px-8 pt-8 sm:pt-10 pb-10">
          <div className="font-mono text-[12px] tracking-[.2em] uppercase text-accent">
            İlaç Etkileşim &amp; Arama Sistemi
          </div>
          {/* Masaüstünde tam 2 satır: kırılım virgülden sonra sabitlenir */}
          <h1 className="font-display font-extrabold text-4xl sm:text-[52px] sm:leading-[1.08] tracking-[-0.02em] text-text-primary mx-auto mt-4 max-w-[860px]">
            İlacınızı aratın,
            <br className="hidden sm:block" /> etkileşimleri{' '}
            <span className="text-accent">anında</span> görün.
          </h1>
          <p className="text-[15px] sm:text-[17px] leading-relaxed text-text-secondary max-w-[540px] mx-auto mt-3.5">
            Tek bir arama çubuğu: ilaç bulun, listenize ekleyin, aralarındaki
            etkileşimleri risk seviyeleriyle kontrol edin.
          </p>
          <div className="flex justify-center gap-[22px] mt-3.5 text-[12.5px] font-medium text-text-muted">
            <span><span className="font-mono text-accent">1</span> Ara</span>
            <span><span className="font-mono text-accent">2</span> Ekle</span>
            <span><span className="font-mono text-accent">3</span> Kontrol Et</span>
          </div>

          {/* Odak kart — arama buraya gömülür */}
          <div className="max-w-[740px] mx-auto mt-6 bg-card border border-ink/10 rounded-[20px] shadow-[0_40px_80px_-34px_rgba(20,32,46,.4)] text-left p-5 sm:p-[26px]">
            {children}
          </div>
        </div>
      </section>

      {/* GÜVEN ŞERİDİ — sayısız */}
      <section className="w-full border-y border-border">
        <div className="max-w-[1180px] mx-auto grid grid-cols-2 lg:grid-cols-4">
          <TrustCell title="TİTCK" sub="Ürün verisi kaynağı" />
          <TrustCell title="Cihazında" sub="Veri dışarı çıkmaz" />
          <TrustCell title="Açık kaynak" sub="Denetlenebilir kod" />
          <TrustCell title="Ücretsiz" sub="Bireysel kullanım" last />
        </div>
      </section>

      {/* ÖZELLİKLER */}
      <section className="max-w-[1180px] mx-auto grid sm:grid-cols-3 px-5 sm:px-12 py-12 sm:py-[52px] gap-y-8">
        <Feature
          icon={Search}
          title="İlaç Arama"
          desc="Barkod, etken madde veya ticari isimle 20.000'i aşkın ilaç arasında anlık arama."
          first
        />
        <Feature
          icon={Scan}
          title="Etkileşim Kontrolü"
          desc="Birden fazla ilacı ekleyin, çakışmaları risk düzeyine göre renkli görün."
        />
        <Feature
          icon={FileText}
          title="Prospektüs Bilgisi"
          desc="Endikasyon, kullanım ve saklama bilgisine tek ekranda ulaşın."
        />
      </section>

      {/* KOYU BANT — gerçek özelliğe bağlanır: hastalığa göre arama */}
      <section className="max-w-[1180px] mx-auto px-5 sm:px-12 pb-12 sm:pb-[52px]">
        {/* Bant her iki temada da koyu; metin/buton renkleri token değil SABİT
            açık tonlardır — koyu modda "koyu üstüne koyu" okunmazlığı yaşanmaz. */}
        <div className="bg-ink rounded-[20px] p-7 sm:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 dark:border dark:border-border">
          <div>
            <div className="font-mono text-[12px] tracking-[.15em] uppercase" style={{ color: '#7FA8D6' }}>
              Hastalığa göre arama
            </div>
            <div className="font-display font-bold text-[22px] sm:text-[27px] leading-tight mt-2.5 max-w-[540px] text-[#F1F4F9]">
              Şikâyetinizi yazın; uygun etken maddeleri ve ilaçları görün
            </div>
          </div>
          <button
            onClick={onConditionMode}
            className="flex-none px-6 py-3.5 bg-[#F1F4F9] text-[#122438] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Hastalığa Göre Ara →
          </button>
        </div>
      </section>
    </>
  );
}

function TrustCell({ title, sub, last }) {
  return (
    <div className={`px-6 sm:px-[30px] py-6 border-border ${last ? '' : 'lg:border-r'} border-b lg:border-b-0`}>
      <div className="font-display font-bold text-2xl sm:text-[28px] tracking-tight text-text-primary flex items-center gap-2">
        {title === 'TİTCK' && <BadgeCheck className="w-5 h-5 text-accent" aria-hidden="true" />}
        {title === 'Cihazında' && <Lock className="w-5 h-5 text-accent" aria-hidden="true" />}
        {title === 'Açık kaynak' && <Github className="w-5 h-5 text-accent" aria-hidden="true" />}
        {title === 'Ücretsiz' && <Database className="w-5 h-5 text-accent" aria-hidden="true" />}
        {title}
      </div>
      <div className="font-mono text-[11px] uppercase tracking-[.08em] text-text-muted mt-1">{sub}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc, first }) {
  return (
    <div className={`sm:px-[34px] ${first ? 'sm:pl-0' : 'sm:border-l sm:border-border'}`}>
      <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center mb-4">
        <Icon className="w-[19px] h-[19px] text-accent" />
      </div>
      <div className="text-[17px] font-semibold text-text-primary mb-1.5">{title}</div>
      <div className="text-sm leading-[1.55] text-text-secondary">{desc}</div>
    </div>
  );
}
