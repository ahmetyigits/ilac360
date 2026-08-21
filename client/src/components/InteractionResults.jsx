import { useState, useRef } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, ShieldAlert, ChevronDown, ChevronUp, Info, HelpCircle, Printer } from 'lucide-react';
import { getWarningsForDrugs } from '../data/api';
import { getFoodByKey } from '../data/foodStore.js';

// Besin tarafı adının önüne katalog emojisi eklenir ("🍊 Greyfurt")
function displayName(name, foodKey) {
  if (!foodKey) return name;
  const emoji = getFoodByKey(foodKey)?.emoji;
  return emoji ? `${emoji} ${name}` : name;
}

// Yazdırılan rapordaki tekil ilaç uyarı tipleri (drug-warnings.json `type`)
const WARNING_TYPE_LABELS = {
  pregnancy: 'Gebelik',
  allergy: 'Alerji',
  age: 'Yaş Sınırı',
  administration: 'Kullanım Şekli',
  driving: 'Araç Kullanımı',
  food: 'Besin',
  supplement: 'Takviye',
  general: 'Genel',
};

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

  const handlePrint = async () => {
    // Pencere SENKRON açılmalı (popup engelleyici, await sonrası açılışı engeller);
    // içerik uyarılar çözüldükten sonra yazılır.
    const win = window.open('', '_blank');
    if (!win) {
      // Popup engelleyici: sessiz crash yerine kullanıcıya haber ver.
      if (onPrintBlocked) onPrintBlocked();
      else window.alert('Yazdırma penceresi tarayıcı tarafından engellendi. Lütfen açılır pencerelere izin verin.');
      return;
    }

    // Tekil ilaç uyarıları analizdeki id'lerden çözülür (sepet sonradan
    // değişmiş olsa bile rapor, analiz anındaki ilaç setiyle tutarlı kalır).
    const seenIds = new Set();
    const refs = [];
    for (const i of interactions) {
      for (const id of [i.id1, i.id2]) {
        if (id != null && !seenIds.has(id)) {
          seenIds.add(id);
          refs.push({ id });
        }
      }
    }
    let drugWarnings = [];
    try {
      drugWarnings = await getWarningsForDrugs(refs);
    } catch {
      // Uyarılar yüklenemezse rapor uyarı bölümü olmadan basılır.
    }

    win.document.write(`
      <html><head><title>Etkileşim Raporu</title>
      <style>body{font-family:'Hanken Grotesk',system-ui,sans-serif;padding:24px;color:#0F172A}
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
          <div class="pair">${escapeHtml(displayName(i.drug1, i.food1))} ↔ ${escapeHtml(displayName(i.drug2, i.food2))} <span class="badge">${escapeHtml(cfg.label)}</span></div>
          <div class="msg">${escapeHtml(i.message || '')}</div>
          ${i.ingredientA || i.ingredientB ? `<div class="msg">${escapeHtml(i.ingredientA || '—')} ↔ ${escapeHtml(i.ingredientB || '—')}</div>` : ''}
        </div>`;
      }).join('')}
      ${drugWarnings.length > 0 ? `
        <h1 style="font-size:15px;margin:20px 0 8px">Tekil İlaç Uyarıları</h1>
        <p class="sub">Seçili ilaçların ürün etiketlerinden derlenmiş genel uyarılar (alerji, gebelik, besin vb.). Liste kapsayıcı değildir.</p>
        ${drugWarnings.map((d) => `<div class="card">
          <div class="pair">${escapeHtml(d.name)}</div>
          ${d.warnings.map((w) => `<div class="msg"><strong>${escapeHtml(WARNING_TYPE_LABELS[w.type] || w.type)} — ${escapeHtml(w.title)}:</strong> ${escapeHtml(w.message)} <em>(Kaynak: ${escapeHtml(w.source)})</em></div>`).join('')}
        </div>`).join('')}
      ` : ''}
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
      {/* Başlık: mono kicker + display başlık, sağda yazdır + filtre çipleri */}
      <div className="px-5 sm:px-[26px] pt-5 sm:pt-[22px] pb-4 border-b border-border-light flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="font-mono text-[11px] tracking-[.18em] uppercase text-accent">Analiz Sonucu</span>
          <h2 className="font-display font-bold text-[20px] sm:text-[24px] tracking-tight text-text-primary mt-1.5 flex items-baseline gap-2.5">
            Etkileşim Sonuçları
            <span className="font-mono font-normal text-[12px] text-text-muted tracking-normal">
              {interactions.length} sonuç
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(riskCounts).map(([risk, count]) => {
            const cfg = riskConfig[risk];
            if (!cfg) return null;
            return (
              <button
                key={risk}
                onClick={() => setRiskFilter(riskFilter === risk ? 'all' : risk)}
                title={cfg.label}
                className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold px-2.5 py-1 rounded-[8px] border cursor-pointer transition-all ${cfg.badge} ${riskFilter === risk ? 'ring-2 ring-accent/30' : 'hover:opacity-80'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {count}
              </button>
            );
          })}
          {interactions.length > 0 && (
            <button
              onClick={handlePrint}
              title="Raporu yazdır"
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-accent border border-accent/25 hover:bg-accent-soft px-3 py-1.5 rounded-[10px] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yazdır</span>
            </button>
          )}
        </div>
      </div>

      {/* Özet Banner — 3A panel dili */}
      {interactions.length > 0 && highestConfig && (
        <div className={`mx-5 sm:mx-[26px] mt-4 rounded-[14px] border p-4 ${highestConfig.card}`}>
          <div className="flex items-center gap-3.5">
            <div className={`flex-none w-[42px] h-[42px] rounded-[13px] text-white flex items-center justify-center ${highestConfig.iconBox}`}>
              <span className="font-display font-bold text-[20px] leading-none" aria-hidden="true">{highestConfig.glyph}</span>
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-text-primary">{summaryText}</p>
              <p className="font-mono text-[11px] text-text-secondary mt-1">
                {Object.entries(riskCounts).map(([risk, count]) => {
                  const cfg = riskConfig[risk];
                  return cfg ? `${count} ${cfg.label.toLowerCase()}` : null;
                }).filter(Boolean).join(' · ')}
              </p>
            </div>
            {riskFilter !== 'all' && (
              <button
                onClick={() => setRiskFilter('all')}
                className="text-[12px] font-semibold text-accent hover:underline cursor-pointer shrink-0"
              >
                Filtreyi kaldır
              </button>
            )}
          </div>
        </div>
      )}

      {unknownDrugs && unknownDrugs.length > 0 && (
        <div className="mx-5 sm:mx-[26px] mt-4 rounded-[14px] border border-[#EAD9B8] bg-[#FBF3E2]/80 dark-warn p-4 flex items-start gap-3.5">
          <div className="flex-none w-[38px] h-[38px] rounded-[11px] bg-[#B5761E] text-white flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-[#7A4E12] warn-title">Veritabanında Bulunamayan İlaçlar</p>
            <p className="text-[12.5px] leading-relaxed text-[#8A6320] mt-0.5">
              {unknownDrugs.join(', ')} — Bu ilaçlar veritabanında bulunamadığı için analiz dışı bırakıldı.
            </p>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-[26px] space-y-3">
        {interactions.length === 0 ? (
          <div className="text-center py-10 text-text-muted">
            <HelpCircle className="w-8 h-8 mx-auto mb-3 text-slate-400" />
            <p className="text-[15px] font-semibold text-text-primary">Analiz edilebilir çift bulunamadı</p>
            <p className="text-[12.5px] mt-1">Seçilen ilaçlar için karşılaştırma yapılamadı.</p>
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-[13px] bg-card-inset text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-accent-soft/60 transition-all cursor-pointer"
              >
                <Info className="w-4 h-4 text-accent" />
                <span>{lowRiskInteractions.length} düşük öncelikli sonucu göster (bilinmiyor/bilgi)</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}

            {riskFilter === 'all' && showLowRisk && lowRiskInteractions.length > 0 && (
              <button
                onClick={() => setShowLowRisk(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-[13px] bg-card-inset text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-accent-soft/60 transition-all cursor-pointer"
              >
                <span>Düşük öncelikli sonuçları gizle</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            )}

            {visibleInteractions.length === 0 && riskFilter !== 'all' && (
              <div className="text-center py-6 text-text-muted">
                <p className="text-sm">Bu risk seviyesinde etkileşim yok.</p>
                <button onClick={() => setRiskFilter('all')} className="text-[12.5px] font-semibold text-accent mt-1 cursor-pointer hover:underline">
                  Tüm sonuçları göster
                </button>
              </div>
            )}
          </>
        )}

        {/* Risk seviyeleri lejantı + hasta faktörü uyarısı */}
        {interactions.length > 0 && (
          <div className="mt-4 rounded-[14px] bg-card-inset p-4 sm:p-5 space-y-2.5">
            <p className="font-mono text-[10.5px] tracking-[.12em] uppercase text-text-muted">Risk seviyeleri ne anlama gelir?</p>
            <div className="grid sm:grid-cols-2 gap-x-5 gap-y-1.5">
              {['critical', 'high', 'medium', 'unknown', 'info'].map((risk) => {
                const cfg = riskConfig[risk];
                return (
                  <div key={risk} className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot} mt-[5px] shrink-0`} />
                    <p className="text-[11.5px] text-text-muted leading-relaxed">
                      <span className="font-semibold text-text-secondary">{cfg.label}:</span> {cfg.legend}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11.5px] text-text-muted leading-relaxed pt-2.5 border-t border-border">
              Bu analiz doz, yaş, gebelik, böbrek/karaciğer fonksiyonu gibi hasta faktörlerini dikkate almaz.
              Sonuçlar yalnızca bilgilendirme amaçlıdır; ilaç kullanımıyla ilgili kararlar için mutlaka doktorunuza veya eczacınıza danışın.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// "Ne yapmalı?" satırı: kuralda özel action varsa o, yoksa risk seviyesine
// göre güvenli varsayılan. unknown/info/low kendi mesajını taşır.
const DEFAULT_ACTIONS = {
  critical: 'Bu kombinasyondan kaçının; kullanmadan önce mutlaka doktorunuza danışın.',
  high: 'Doktorunuza danışmadan birlikte kullanmayın.',
  medium: 'Birlikte kullanım gerekiyorsa doktor veya eczacı takibi önerilir.',
};

function InteractionCard({ interaction }) {
  const config = riskConfig[interaction.risk] || riskConfig.unknown;
  const action = interaction.action || DEFAULT_ACTIONS[interaction.risk] || null;

  return (
    <div className={`rounded-[14px] border p-4 transition-all ${config.card}`}>
      <div className="flex items-start gap-3.5">
        {/* 3A: soldaki renkli ikon karesi */}
        <div className={`flex-none w-[42px] h-[42px] rounded-[13px] text-white flex items-center justify-center ${config.iconBox}`}>
          <span className="font-display font-bold text-[20px] leading-none" aria-hidden="true">{config.glyph}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-semibold text-[15px] text-text-primary">{displayName(interaction.drug1, interaction.food1)}</span>
            <span className="text-text-muted text-[11px]">&harr;</span>
            <span className="font-semibold text-[15px] text-text-primary">{displayName(interaction.drug2, interaction.food2)}</span>
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
          {action && (
            <p className="text-[12.5px] mt-1.5">
              <span className="font-semibold text-text-primary">Ne yapmalı: </span>
              <span className="text-text-secondary">{action}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
