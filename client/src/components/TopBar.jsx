import { Database, CheckCircle, Activity } from 'lucide-react';

export default function TopBar({ totalDrugs, selectedCount, lastAnalysis, currentView }) {
  const viewLabels = {
    checker: 'Etkileşim Kontrolü',
    about: 'Hakkında',
  };

  return (
    <header className="bg-card border-b border-border px-6 py-3.5 shrink-0">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-text-primary pl-10 lg:pl-0">
          {viewLabels[currentView] || 'Etkileşim Kontrolü'}
        </h1>

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
