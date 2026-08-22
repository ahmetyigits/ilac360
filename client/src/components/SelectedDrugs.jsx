import { Loader2, Share2 } from 'lucide-react';
import { buildShareUrl } from '../data/basketStore.js';

// 3A: seçili ilaçlar odak kart dilinde — açık mavi hap çipleri (mavi nokta + ×)
// ve tam genişlik "Etkileşimleri Kontrol Et" düğmesi.
// `embedded`: hero'daki odak kartın İÇİNDE düz blok olarak render edilir
// (kart içinde kart görünümü oluşmaz); aksi halde kendi kartını çizer.
export default function SelectedDrugs({ drugs, onRemove, onSelect, activeDrugId, onAnalyze, analysisLoading, onClearAll, onToast, embedded = false }) {
  const handleShare = async () => {
    const url = buildShareUrl(drugs);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'İlaç listem — ilaç360', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      onToast?.('Bağlantı kopyalandı. Not: bağlantı listenizdeki ilaç kimliklerini içerir; kiminle paylaştığınıza dikkat edin.', 'info');
    } catch (err) {
      // Kullanıcının paylaşım penceresini iptal etmesi hata değildir.
      if (err?.name !== 'AbortError') {
        onToast?.('Bağlantı kopyalanamadı. Adres çubuğundan elle kopyalayabilirsiniz.', 'warning');
      }
    }
  };

  return (
    <div
      className={
        embedded
          ? 'mt-4 pt-4 border-t border-border-light animate-fade-in'
          : 'bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] p-5 sm:p-[26px] animate-fade-in'
      }
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-text-primary">
          Seçili İlaçlar
          <span className="font-mono text-[11px] text-text-muted ml-2">{drugs.length}/10</span>
        </h2>
        <div className="flex items-center gap-3">
          {drugs.length >= 1 && (
            <button
              onClick={handleShare}
              title="Listeyi bağlantı olarak paylaş"
              className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent-deep transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Paylaş
            </button>
          )}
          {drugs.length >= 2 && (
            <button
              onClick={onClearAll}
              className="text-[13px] text-text-muted hover:text-risk-high transition-colors cursor-pointer"
            >
              Tümünü temizle
            </button>
          )}
        </div>
      </div>

      {/* Çip = iki AYRI gerçek buton (ad → detay, × → kaldır). Button içinde
          role="button" span geçersiz HTML'di ve klavyeyle silinemiyordu. */}
      <div className="flex flex-wrap gap-[9px]">
        {drugs.map((drug) => drug.isFood ? (
          // Besin çipi: detay tıklaması yok, emoji + soft amber ayrımı
          <div
            key={drug.id}
            className="flex items-center rounded-xl text-sm font-medium bg-[#FBF3E2]/80 dark-warn border border-[#EAD9B8] text-text-primary"
          >
            <span className="flex items-center gap-[7px] pl-[13px] py-2.5" title={drug.longName || 'Besin/içecek'}>
              <span aria-hidden="true" className="text-[15px] leading-none">{drug.emoji}</span>
              <span className="truncate max-w-48">{drug.name}</span>
            </span>
            <button
              aria-label={`${drug.name} listeden çıkar`}
              onClick={() => onRemove(drug.id)}
              className="px-[11px] py-2.5 rounded-r-xl text-[16px] leading-none text-text-muted hover:text-risk-high transition-colors cursor-pointer"
            >
              ×
            </button>
          </div>
        ) : (
          <div
            key={drug.id}
            className={`flex items-center rounded-xl text-sm font-medium transition-all ${
              activeDrugId === drug.id
                ? 'bg-accent text-white'
                : 'bg-accent-soft text-text-primary hover:bg-accent-light/60'
            }`}
          >
            <button
              onClick={() => onSelect(drug)}
              title={drug.activeIngredient ? `Etkin Madde: ${drug.activeIngredient}` : 'Detayı gör'}
              className="flex items-center gap-[9px] pl-[13px] py-2.5 rounded-l-xl cursor-pointer"
            >
              <span className={`w-[7px] h-[7px] rounded-full flex-none ${activeDrugId === drug.id ? 'bg-white' : drug.isSupplement ? 'bg-emerald-500' : 'bg-accent'}`} />
              <span className="truncate max-w-48">{drug.name}</span>
              {drug.isSupplement && (
                <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full ${
                  activeDrugId === drug.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                }`}>
                  Takviye
                </span>
              )}
            </button>
            <button
              aria-label={`${drug.name} listeden çıkar`}
              onClick={() => onRemove(drug.id)}
              className={`px-[11px] py-2.5 rounded-r-xl text-[16px] leading-none transition-colors cursor-pointer ${
                activeDrugId === drug.id ? 'text-white/70 hover:text-white' : 'text-text-muted hover:text-risk-high'
              }`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {drugs.length < 2 ? (
        <p className="text-[13px] text-text-muted mt-4">
          Etkileşim analizi için en az 2 öge (ilaç veya besin) seçin.
        </p>
      ) : !drugs.some((d) => !d.isFood) ? (
        <p className="text-[13px] text-text-muted mt-4">
          Besin etkileşimi analizi için listeye en az 1 ilaç ekleyin.
        </p>
      ) : (
        <button
          onClick={onAnalyze}
          disabled={analysisLoading}
          className="w-full mt-4 py-[15px] bg-accent text-white text-center rounded-[13px] text-[15.5px] font-semibold hover:bg-accent-deep transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
        >
          {analysisLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Etkileşimleri Kontrol Et
        </button>
      )}
    </div>
  );
}
