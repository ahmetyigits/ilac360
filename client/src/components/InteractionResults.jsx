import { useState, useRef } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, ShieldAlert, ChevronDown, ChevronUp, Info, HelpCircle, Printer } from 'lucide-react';

// 3A panel dili: solda renkli ikon karesi, başlık satırında mono RİSK rozeti.
const riskConfig = {
  critical: {
    icon: ShieldAlert,
    label: 'Kritik',
    glyph: '!',
    legend: 'Birlikte kullanımı hayati risk taşır; kontrendike olabilir.',
    dot: 'bg-risk-critical',
    iconColor: 'text-risk-critical',
    iconBox: 'bg-red-700',
    badgeSolid: 'bg-red-700 text-white',
    badge: 'bg-red-50 text-risk-critical border-red-100 dark-risk-critical',
    card: 'border-red-200/70 bg-red-50/50 dark-risk-critical',
  },
  high: {
    icon: AlertTriangle,
    label: 'Yüksek',
    glyph: '!',
    legend: 'Ciddi yan etki riski; doktor kontrolü olmadan birlikte kullanılmamalı.',
    dot: 'bg-risk-high',
    iconColor: 'text-risk-high',
    iconBox: 'bg-[#B5761E]',
    badgeSolid: 'bg-[#B5761E] text-white',
    badge: 'bg-orange-50 text-risk-high border-orange-100 dark-risk-high',
    card: 'border-[#EAD9B8] bg-[#FBF3E2]/80 dark-risk-high',
  },
  medium: {
    icon: AlertCircle,
    label: 'Orta',
    glyph: '!',
    legend: 'Etkileşim olabilir; doz ayarı veya takip gerekebilir.',
    dot: 'bg-risk-medium',
    iconColor: 'text-risk-medium',
    iconBox: 'bg-amber-500',
    badgeSolid: 'bg-amber-500 text-white',
    badge: 'bg-amber-50 text-risk-medium border-amber-100 dark-risk-medium',
    card: 'border-amber-100 bg-amber-50/50 dark-risk-medium',
  },
  low: {
    icon: CheckCircle,
    label: 'Düşük',
    glyph: '✓',
    legend: 'Bilinen etkileşim hafif; genellikle klinik önemi azdır.',
    dot: 'bg-risk-low',
    iconColor: 'text-risk-low',
    iconBox: 'bg-emerald-600',
    badgeSolid: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-50 text-risk-low border-emerald-100 dark-risk-low',
    card: 'border-emerald-100 bg-emerald-50/40 dark-risk-low',
  },
  // "Kural bulunamadı" güvenli demek DEĞİLDİR — yeşil değil gri gösterilir.
  unknown: {
    icon: HelpCircle,
    label: 'Bilinmiyor',
    glyph: '?',
    legend: 'Veritabanında kural yok; etkileşim olmadığı anlamına gelmez.',
    dot: 'bg-slate-400',
    iconColor: 'text-slate-500',
    iconBox: 'bg-slate-400',
    badgeSolid: 'bg-slate-400 text-white',
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
    card: 'border-slate-200 bg-slate-50/60 dark:bg-slate-500/10 dark:border-slate-500/30',
  },
  info: {
    icon: Info,
    label: 'Bilgi',
    glyph: 'i',
    legend: 'Etkileşim değil; aynı ilaç grubuna dair bilgilendirme.',
    dot: 'bg-accent',
    iconColor: 'text-accent',
    iconBox: 'bg-accent',
    badgeSolid: 'bg-accent text-white',
    badge: 'bg-accent-soft text-accent border-accent-light',
    card: 'border-accent-light bg-accent-soft/60',
  },
  safe: {
    icon: CheckCircle,
    label: 'Güvenli',
    glyph: '✓',
    legend: 'Bilinen etkileşim yok.',
    dot: 'bg-risk-safe',
    iconColor: 'text-risk-safe',
    iconBox: 'bg-emerald-600',
    badgeSolid: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-50 text-risk-safe border-emerald-100 dark-risk-safe',
    card: 'border-emerald-100 bg-emerald-50/40 dark-risk-safe',
  },
};

// Katlanabilir "düşük öncelikli" grup: gerçek uyarılar değil.
const FOLDED_RISKS = new Set(['low', 'unknown', 'info']);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function InteractionResults({ interactions, unknownDrugs, onPrintBlocked }) {
  const [showLowRisk, setShowLowRisk] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');
  const printRef = useRef(null);

  if (!interactions) return null;

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) {
      // Popup engelleyici: sessiz crash yerine kullanıcıya haber ver.
      if (onPrintBlocked) onPrintBlocked();
      else window.alert('Yazdırma penceresi tarayıcı tarafından engellendi. Lütfen açılır pencerelere izin verin.');
      return;
    }
    win.document.write(`
      <html><head><title>Etkileşim Raporu</title>
      <style>body{font-family:Inter,sans-serif;padding:24px;color:#0F172A}
      h1{font-size:18px;margin-bottom:4px}
      .sub{color:#64748B;font-size:12px;margin-bottom:16px}
      .card{border:1px solid #E2E8F0;border-radius:8px;padding:12px;margin-bottom:8px}
      .risk-critical{border-left:4px solid #991B1B}.risk-high{border-left:4px solid #DC2626}
      .risk-medium{border-left:4px solid #D97706}.risk-low{border-left:4px solid #059669}
      .risk-unknown{border-left:4px solid #94A3B8}.risk-info{border-left:4px solid #38BDF8}
      .pair{font-weight:600;font-size:14px}.msg{font-size:12px;color:#64748B;margin-top:4px}
      .badge{display:inline-block;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:600}
      .warn{background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:8px;padding:10px;margin-bottom:12px;font-size:12px}
      .footer{margin-top:24px;padding-top:12px;border-top:1px solid #E2E8F0;font-size:10px;color:#94A3B8}
      </style></head><body>
      <h1>İlaç Etkileşim Raporu</h1>
      <p class="sub">${escapeHtml(new Date().toLocaleString('tr-TR', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }))}</p>
      <div style="display:flex;gap:16px;margin-bottom:16px">
        <div style="flex:1;border:1px solid #E2E8F0;border-radius:8px;padding:10px">
          <p style="font-size:10px;color:#94A3B8;margin:0 0 4px">Hasta Adı</p>
          <div style="border-bottom:1px solid #E2E8F0;min-height:20px"></div>
        </div>
        <div style="flex:1;border:1px solid #E2E8F0;border-radius:8px;padding:10px">
          <p style="font-size:10px;color:#94A3B8;margin:0 0 4px">Doktor / Eczacı</p>
          <div style="border-bottom:1px solid #E2E8F0;min-height:20px"></div>
        </div>
        <div style="flex:0.6;border:1px solid #E2E8F0;border-radius:8px;padding:10px">
          <p style="font-size:10px;color:#94A3B8;margin:0 0 4px">Not</p>
          <div style="border-bottom:1px solid #E2E8F0;min-height:20px"></div>
        </div>
      </div>
      ${interactions.map(i => {
        const cfg = riskConfig[i.risk] || riskConfig.unknown;
        return `<div class="card risk-${escapeHtml(i.risk)}">
          <div class="pair">${escapeHtml(i.drug1)} ↔ ${escapeHtml(i.drug2)} <span class="badge">${escapeHtml(cfg.label)}</span></div>
          <div class="msg">${escapeHtml(i.message || '')}</div>
          ${i.ingredientA || i.ingredientB ? `<div class="msg">${escapeHtml(i.ingredientA || '—')} ↔ ${escapeHtml(i.ingredientB || '—')}</div>` : ''}
        </div>`;
      }).join('')}
      <div class="footer">Bu rapor yalnızca bilgilendirme amaçlıdır ve doz, yaş, gebelik, böbrek/karaciğer fonksiyonu gibi hasta faktörlerini dikkate almaz. Herhangi bir ilaç kullanmadan önce mutlaka bir sağlık uzmanına danışınız.</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const riskCounts = interactions.reduce((acc, i) => {
    acc[i.risk] = (acc[i.risk] || 0) + 1;
    return acc;
  }, {});

  const highRiskInteractions = interactions.filter((i) => !FOLDED_RISKS.has(i.risk));
  const lowRiskInteractions = interactions.filter((i) => FOLDED_RISKS.has(i.risk));

  let visibleInteractions = showLowRisk ? interactions : highRiskInteractions;
  if (riskFilter !== 'all') {
    visibleInteractions = interactions.filter((i) => i.risk === riskFilter);
  }

  // Özet banner için en yüksek risk seviyesi
  const riskOrder = ['critical', 'high', 'medium', 'low', 'unknown', 'info', 'safe'];
  const highestRisk = riskOrder.find((r) => riskCounts[r] > 0);
  const highestConfig = highestRisk ? riskConfig[highestRisk] : null;

  const seriousCount = (riskCounts.critical || 0) + (riskCounts.high || 0);
  const summaryText = seriousCount > 0
    ? `${seriousCount} yüksek/kritik riskli etkileşim tespit edildi`
    : riskCounts.medium > 0
      ? `${riskCounts.medium} orta riskli etkileşim tespit edildi`
      : 'Bilinen yüksek riskli etkileşim bulunamadı — bu, etkileşim olmadığını garanti etmez';

  return (
    <div ref={printRef} className="bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] overflow-hidden animate-slide-up">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-text-primary">Etkileşim Sonuçları</h2>
          <span className="text-[11px] text-text-muted bg-bg-primary px-2 py-0.5 rounded-full font-medium">
            {interactions.length} sonuç
          </span>
        </div>
        <div className="flex items-center gap-2">
          {interactions.length > 0 && (
            <button
              onClick={handlePrint}
              title="Raporu yazdır"
              className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary px-2 py-1 rounded-md hover:bg-bg-primary transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yazdır</span>
            </button>
          )}
          {Object.entries(riskCounts).map(([risk, count]) => {
            const cfg = riskConfig[risk];
            if (!cfg) return null;
            return (
              <button
                key={risk}
                onClick={() => setRiskFilter(riskFilter === risk ? 'all' : risk)}
                title={cfg.label}
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-pointer transition-all ${cfg.badge} ${riskFilter === risk ? 'ring-2 ring-accent/30 scale-105' : 'hover:scale-105'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Özet Banner */}
      {interactions.length > 0 && highestConfig && (
        <div className={`mx-4 mt-3 rounded-lg border p-3 ${highestConfig.card}`}>
          <div className="flex items-center gap-3">
            <highestConfig.icon className={`w-5 h-5 shrink-0 ${highestConfig.iconColor}`} />
            <div className="flex-1">
              <p className="text-xs font-semibold text-text-primary">{summaryText}</p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {Object.entries(riskCounts).map(([risk, count]) => {
                  const cfg = riskConfig[risk];
                  return cfg ? `${count} ${cfg.label.toLowerCase()}` : null;
                }).filter(Boolean).join(' · ')}
              </p>
            </div>
            {riskFilter !== 'all' && (
              <button
                onClick={() => setRiskFilter('all')}
                className="text-[10px] text-accent hover:underline cursor-pointer shrink-0"
              >
                Filtreyi kaldır
              </button>
            )}
          </div>
        </div>
      )}

      {unknownDrugs && unknownDrugs.length > 0 && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50/50 dark-warn p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-800 warn-title">Veritabanında Bulunamayan İlaçlar</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {unknownDrugs.join(', ')} — Bu ilaçlar veritabanında bulunamadığı için analiz dışı bırakıldı.
            </p>
          </div>
        </div>
      )}

      <div className="p-4 space-y-2.5">
        {interactions.length === 0 ? (
          <div className="text-center py-10 text-text-muted">
            <HelpCircle className="w-8 h-8 mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-medium text-text-primary">Analiz edilebilir çift bulunamadı</p>
            <p className="text-[11px] mt-1">Seçilen ilaçlar için karşılaştırma yapılamadı.</p>
          </div>
        ) : (
          <>
            {visibleInteractions.map((interaction) => (
              <InteractionCard
                key={`${interaction.drug1}::${interaction.drug2}`}
                interaction={interaction}
              />
            ))}

            {riskFilter === 'all' && !showLowRisk && lowRiskInteractions.length > 0 && (
              <button
                onClick={() => setShowLowRisk(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-[12px] text-text-muted hover:text-text-secondary hover:bg-bg-primary transition-all cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{lowRiskInteractions.length} düşük öncelikli sonucu göster (bilinmiyor/bilgi)</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            )}

            {riskFilter === 'all' && showLowRisk && lowRiskInteractions.length > 0 && (
              <button
                onClick={() => setShowLowRisk(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-[12px] text-text-muted hover:text-text-secondary hover:bg-bg-primary transition-all cursor-pointer"
              >
                <span>Düşük öncelikli sonuçları gizle</span>
                <ChevronUp className="w-3 h-3" />
              </button>
            )}

            {visibleInteractions.length === 0 && riskFilter !== 'all' && (
              <div className="text-center py-6 text-text-muted">
                <p className="text-sm">Bu risk seviyesinde etkileşim yok.</p>
                <button onClick={() => setRiskFilter('all')} className="text-xs text-accent mt-1 cursor-pointer hover:underline">
                  Tüm sonuçları göster
                </button>
              </div>
            )}
          </>
        )}

        {/* Risk seviyeleri lejantı + hasta faktörü uyarısı */}
        {interactions.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-bg-primary/60 p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-text-secondary">Risk seviyeleri ne anlama gelir?</p>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {['critical', 'high', 'medium', 'unknown', 'info'].map((risk) => {
                const cfg = riskConfig[risk];
                return (
                  <div key={risk} className="flex items-start gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mt-1.5 shrink-0`} />
                    <p className="text-[10px] text-text-muted leading-relaxed">
                      <span className="font-medium text-text-secondary">{cfg.label}:</span> {cfg.legend}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed pt-1 border-t border-border">
              Bu analiz doz, yaş, gebelik, böbrek/karaciğer fonksiyonu gibi hasta faktörlerini dikkate almaz.
              Sonuçlar yalnızca bilgilendirme amaçlıdır; ilaç kullanımıyla ilgili kararlar için mutlaka doktorunuza veya eczacınıza danışın.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InteractionCard({ interaction }) {
  const config = riskConfig[interaction.risk] || riskConfig.unknown;

  return (
    <div className={`rounded-[14px] border p-4 transition-all ${config.card}`}>
      <div className="flex items-start gap-3.5">
        {/* 3A: soldaki renkli ikon karesi */}
        <div className={`flex-none w-[42px] h-[42px] rounded-[13px] text-white flex items-center justify-center ${config.iconBox}`}>
          <span className="font-serif font-bold text-[22px] leading-none" aria-hidden="true">{config.glyph}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-semibold text-[15px] text-text-primary">{interaction.drug1}</span>
            <span className="text-text-muted text-[11px]">&harr;</span>
            <span className="font-semibold text-[15px] text-text-primary">{interaction.drug2}</span>
            <span className={`font-mono text-[10.5px] font-bold px-[9px] py-[2px] rounded-md uppercase ${config.badgeSolid}`}>
              {config.label}
            </span>
          </div>
          {(interaction.ingredientA || interaction.ingredientB) && (
            <p className="text-[11px] text-text-muted mt-1">
              {interaction.ingredientA || '—'} ↔ {interaction.ingredientB || '—'}
            </p>
          )}
          <p className="text-[13.5px] text-text-secondary mt-1 leading-[1.5]">{interaction.message}</p>
          {interaction.details && (
            <p className="text-[12px] text-text-muted mt-0.5">{interaction.details}</p>
          )}
        </div>
      </div>
    </div>
  );
}
