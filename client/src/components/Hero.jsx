// Tasarım 1A: tam genişlik hero — merkezi arama, popüler çipler ve kenardan
// kenara güven şeridi. Arama bileşeni (children) hero'nun içine gömülür.

const POPULAR = ['Parol', 'Aspirin', 'Nurofen', 'Majezik', 'Coumadin', 'Augmentin', 'Cipro', 'Concor'];

export default function Hero({ stats, onPopularSearch, children }) {
  const drugCount = stats?.totalDrugs ? stats.totalDrugs.toLocaleString('tr-TR') : '20.000+';

  return (
    <section className="w-full bg-gradient-to-b from-accent-soft to-bg-primary border-b border-border">
      <div className="max-w-[900px] mx-auto text-center px-5 sm:px-8 pt-14 sm:pt-20 pb-12 sm:pb-16">
        <div className="font-mono text-[13px] font-medium tracking-[.08em] uppercase text-accent">
          TİTCK ürün verisi · {drugCount} ilaç
        </div>
        <h1 className="mx-auto mt-4 mb-3.5 max-w-[820px] text-3xl sm:text-[44px] sm:leading-[1.1] font-bold tracking-tight text-text-primary">
          İlaç etkileşimlerini güvenle, tek adımda kontrol edin
        </h1>
        <p className="mx-auto mb-9 max-w-[600px] text-[15px] sm:text-[17px] leading-relaxed text-text-secondary">
          İlaç adı, etkin madde veya barkod ile arayın; seçtiğiniz ilaçlar arasındaki
          olası etkileşimleri, risk seviyeleriyle birlikte anında görün.
        </p>

        {/* Büyük arama çubuğu (DrugSearch buraya gömülür) */}
        <div className="max-w-[720px] mx-auto text-left">{children}</div>

        <div className="flex items-center justify-center gap-2.5 flex-wrap mt-6">
          <span className="text-sm text-text-muted mr-0.5">Popüler:</span>
          {POPULAR.map((name) => (
            <button
              key={name}
              onClick={() => onPopularSearch?.(name)}
              className="text-sm text-accent bg-card border border-accent/20 rounded-full px-3.5 py-1.5 hover:bg-accent-soft hover:border-accent/40 transition-colors cursor-pointer"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
