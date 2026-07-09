import { ShieldAlert } from 'lucide-react';

export default function LegalWarning() {
  return (
    <div className="rounded-[13px] border border-amber-200/70 bg-amber-50/40 dark-warn px-5 py-4">
      <div className="flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-risk-medium shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900/80 dark:text-text-secondary leading-relaxed m-0">
          Bu sitedeki bilgiler yalnızca bilgilendirme amaçlıdır ve hekim ya da eczacı
          tavsiyesinin yerini tutmaz. İlaç kullanımıyla ilgili kararlar için mutlaka bir
          sağlık profesyoneline danışın. ilaç360 üzerinden ilaç satışı yapılmaz.
        </p>
      </div>
    </div>
  );
}
