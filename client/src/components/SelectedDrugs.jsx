import { Loader2 } from 'lucide-react';

// 3A: seçili ilaçlar odak kart dilinde — açık mavi hap çipleri (mavi nokta + ×)
// ve tam genişlik "Etkileşimleri Kontrol Et" düğmesi.
export default function SelectedDrugs({ drugs, onRemove, onSelect, activeDrugId, onAnalyze, analysisLoading, onClearAll }) {
  return (
    <div className="bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] p-5 sm:p-[26px] animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-text-primary">
          Seçili İlaçlar
          <span className="font-mono text-[11px] text-text-muted ml-2">{drugs.length}/10</span>
        </h2>
        {drugs.length >= 2 && (
          <button
            onClick={onClearAll}
            className="text-[13px] text-text-muted hover:text-risk-high transition-colors cursor-pointer"
          >
            Tümünü temizle
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-[9px]">
        {drugs.map((drug) => (
          <button
            key={drug.id}
            onClick={() => onSelect(drug)}
            title={drug.activeIngredient ? `Etkin Madde: ${drug.activeIngredient}` : 'Detayı gör'}
            className={`flex items-center gap-[9px] px-[13px] py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeDrugId === drug.id
                ? 'bg-accent text-white'
                : 'bg-accent-soft text-text-primary hover:bg-accent-light/60'
            }`}
          >
            <span className={`w-[7px] h-[7px] rounded-full flex-none ${activeDrugId === drug.id ? 'bg-white' : 'bg-accent'}`} />
            <span className="truncate max-w-48">{drug.name}</span>
            <span
              role="button"
              aria-label={`${drug.name} kaldır`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(drug.id);
              }}
              className={`text-[16px] leading-none transition-colors ${
                activeDrugId === drug.id ? 'text-white/70 hover:text-white' : 'text-text-muted hover:text-risk-high'
              }`}
            >
              ×
            </span>
          </button>
        ))}
      </div>

      {drugs.length < 2 ? (
        <p className="text-[13px] text-text-muted mt-4">
          Etkileşim analizi için en az 2 ilaç seçin.
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
