// Tasarım 1A: merkezi arama odaklı hero + popüler aramalar + güven şeridi.
// Arama bileşeni (children) hero'nun içine gömülür.

const POPULAR = ['Parol', 'Aspirin', 'Nurofen', 'Majezik', 'Coumadin', 'Augmentin', 'Cipro', 'Concor'];

export default function Hero({ stats, onPopularSearch, children }) {
  const drugCount = stats?.totalDrugs ? stats.totalDrugs.toLocaleString('tr-TR') : '20.000+';

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="bg-gradient-to-b from-accent-soft to-card px-6 sm:px-12 pt-12 sm:pt-16 pb-12 text-center border-b border-border-light">
        <div className="font-mono text-[13px] font-medium tracking-[.08em] uppercase text-accent">
          TİTCK ürün verisi · {drugCount} ilaç
        </div>
        <h1 className="mx-auto mt-4 mb-3.5 max-w-[820px] text-3xl sm:text-[44px] sm:leading-[1.1] font-bold tracking-tight text-text-primary">
          İlaç etkileşimlerini güvenle, tek adımda kontrol edin
        </h1>
        <p className="mx-auto mb-8 max-w-[600px] text-[15px] sm:text-[17px] leading-relaxed text-text-secondary">
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

      {/* Güven şeridi — canlı istatistikler */}
      <div className="grid grid-cols-2 sm:grid-cols-4">
        <TrustCell
          value={stats?.totalDrugs?.toLocaleString('tr-TR') ?? '—'}
          label="Kayıtlı ilaç"
        />
        <TrustCell
          value={stats?.interactionRules?.toLocaleString('tr-TR') ?? '—'}
          label="Etkileşim kuralı"
        />
        <TrustCell
          value={stats?.conditionCount?.toLocaleString('tr-TR') ?? '—'}
          label="Hastalık başlığı"
        />
        <TrustCell
          value={stats?.descriptionCount?.toLocaleString('tr-TR') ?? '—'}
          label="Prospektüs"
          last
        />
      </div>
    </div>
  );
}

function TrustCell({ value, label, last }) {
  return (
    <div className={`px-6 sm:px-8 py-5 sm:py-6 border-border-light ${last ? '' : 'sm:border-r'} border-b sm:border-b-0`}>
      <div className="text-xl sm:text-[26px] font-bold text-accent">{value}</div>
      <div className="text-sm text-text-secondary mt-0.5">{label}</div>
    </div>
  );
}
