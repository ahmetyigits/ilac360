import { ShieldAlert } from 'lucide-react';

export default function LegalWarning() {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/30 dark-warn p-4">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-risk-medium shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-risk-medium warn-title">Yasal Uyarı</p>
          <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
            Bu sistem yalnızca bilgilendirme amaçlıdır. Herhangi bir ilaç kullanmadan önce
            mutlaka bir sağlık uzmanına danışınız.
          </p>
        </div>
      </div>
    </div>
  );
}
