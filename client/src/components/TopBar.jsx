import { Database, CheckCircle, Activity, ChevronRight } from 'lucide-react';

export default function TopBar({ totalDrugs, selectedCount, lastAnalysis, currentView }) {
  const viewLabels = {
    checker: 'İlaç Kontrol',
    about: 'Hakkında',
  };

  return (
    <header className="bg-card border-b border-border px-6 py-3.5 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-muted">Sistem</span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-primary font-medium">{viewLabels[currentView] || 'İlaç Kontrol'}</span>
        </div>

        <div className="flex items-center gap-3">
          <MetricPill
            icon={Database}
            value={totalDrugs ? totalDrugs.toLocaleString('tr-TR') : '...'}
            unit="ilaç"
          />
          {selectedCount > 0 && (
            <MetricPill
              icon={CheckCircle}
              value={String(selectedCount)}
              unit="seçili"
              highlight
            />
          )}
          {lastAnalysis && (
            <MetricPill
              icon={Activity}
              value={lastAnalysis}
              unit=""
            />
          )}
        </div>
      </div>
    </header>
  );
}

function MetricPill({ icon: Icon, value, unit, highlight }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-full px-3.5 py-1.5 border text-xs ${
      highlight
        ? 'border-accent/20 bg-accent/5'
        : 'border-border bg-bg-primary'
    }`}>
      <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-accent' : 'text-text-muted'}`} />
      <div className="flex items-baseline gap-1">
        <span className="font-semibold text-text-primary">{value}</span>
        {unit && <span className="text-text-muted">{unit}</span>}
      </div>
    </div>
  );
}
