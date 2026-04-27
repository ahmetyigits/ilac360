import { X, FlaskConical, Loader2 } from 'lucide-react';

export default function SelectedDrugs({ drugs, onRemove, onSelect, activeDrugId, onAnalyze, analysisLoading, onClearAll }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-text-primary">Seçili İlaçlar</h2>
          <span className="text-[11px] text-text-muted bg-bg-primary px-2 py-0.5 rounded-full font-medium">
            {drugs.length}
          </span>
        </div>
        {drugs.length >= 2 && (
          <div className="flex items-center gap-2">
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 text-text-muted hover:text-risk-high px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-border hover:border-red-200"
            >
              <X className="w-3.5 h-3.5" />
              Tümünü Temizle
            </button>
            <button
              onClick={onAnalyze}
              disabled={analysisLoading}
              className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-xs font-medium transition-all hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
            >
              {analysisLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FlaskConical className="w-3.5 h-3.5" />
              )}
              Analiz Et
            </button>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-wrap gap-2">
        {drugs.map((drug) => (
          <button
            key={drug.id}
            onClick={() => onSelect(drug)}
            title={drug.activeIngredient ? `Etkin Madde: ${drug.activeIngredient}` : ''}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
              activeDrugId === drug.id
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-card border-border text-text-primary hover:border-accent/30 hover:bg-accent/5'
            }`}
          >
            <span className="truncate max-w-48">{drug.name}</span>
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(drug.id);
              }}
              className={`rounded-full p-0.5 transition-colors ${
                activeDrugId === drug.id
                  ? 'hover:bg-white/20'
                  : 'hover:bg-risk-high/10 hover:text-risk-high'
              }`}
            >
              <X className="w-3 h-3" />
            </span>
          </button>
        ))}
      </div>
      {drugs.length < 2 && (
        <div className="px-5 pb-4">
          <p className="text-[11px] text-text-muted">
            Etkileşim analizi için en az 2 ilaç seçin.
          </p>
        </div>
      )}
    </div>
  );
}
