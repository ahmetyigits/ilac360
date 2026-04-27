import { Info, ShieldAlert, Database, Layers, FileText } from 'lucide-react';

export default function AboutPage({ stats }) {
  const drugCount = stats ? stats.totalDrugs.toLocaleString('tr-TR') : '—';
  const ingredientCount = stats ? stats.uniqueIngredients.toLocaleString('tr-TR') : '—';
  const atcCount = stats ? stats.uniqueAtcCodes.toLocaleString('tr-TR') : '—';
  const ruleCount = stats?.interactionRules ? stats.interactionRules.toLocaleString('tr-TR') : '—';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2.5">
            <Info className="w-4 h-4 text-accent" />
            Hakkında
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-text-secondary leading-relaxed">
            Bu site, Türkiye'de ruhsatlı ilaçların etkin maddeleri ve ATC kodları üzerinden
            olası etkileşimleri kontrol etmek için hazırlanmış basit bir araçtır. Tüm
            arama ve analiz tarayıcınızda yerel olarak çalışır; hiçbir veri sunucuya gönderilmez.
          </p>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
              Veri Seti
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="İlaç" value={drugCount} />
              <Stat label="Etkin Madde" value={ingredientCount} />
              <Stat label="ATC Kodu" value={atcCount} />
              <Stat label="Etkileşim Kuralı" value={ruleCount} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
              Nasıl Çalışır
            </h3>
            <ul className="space-y-2.5 text-sm text-text-secondary leading-relaxed">
              <li className="flex gap-2.5">
                <Database className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>Seçtiğiniz ilaçların etkin maddeleri ve ATC kodları çıkarılır.</span>
              </li>
              <li className="flex gap-2.5">
                <Layers className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>Bu maddeler, bilinen etkileşim kurallarıyla eşleştirilir.</span>
              </li>
              <li className="flex gap-2.5">
                <FileText className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>Eşleşen etkileşimler, risk seviyesi ve kısa açıklamayla listelenir.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-100 bg-amber-50/30 dark-warn p-4">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-risk-medium shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-risk-medium warn-title">Yasal Uyarı</p>
                <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                  Bu araç tanı veya tedavi için kullanılamaz. Yalnızca bilgilendirme amaçlıdır.
                  İlaç değişikliği ya da yeni bir ilaç kullanımı için mutlaka doktor veya
                  eczacınıza danışın.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-text-muted pt-3 border-t border-border space-y-0.5">
            <p>Veri kaynağı: Türkiye İlaç Veritabanı.</p>
            <p>Etkileşim verisi açık kaynaklı klinik referanslardan derlenmiştir.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-bg-primary px-3 py-2.5">
      <p className="text-base font-semibold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted mt-0.5">{label}</p>
    </div>
  );
}
