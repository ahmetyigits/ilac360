import { Info, ShieldAlert, Database, Layers, FileText, AlertTriangle, Github } from 'lucide-react';

export default function AboutPage({ stats }) {
  const drugCount = stats ? stats.totalDrugs.toLocaleString('tr-TR') : '—';
  const ingredientCount = stats ? stats.uniqueIngredients.toLocaleString('tr-TR') : '—';
  const atcCount = stats ? stats.uniqueAtcCodes.toLocaleString('tr-TR') : '—';
  const ruleCount = stats?.interactionRules ? stats.interactionRules.toLocaleString('tr-TR') : '—';
  const dataDate = stats?.dataGeneratedAt
    ? new Date(stats.dataGeneratedAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* 3A kart dili: rounded-[20px] + derin yumuşak gölge + display başlık */}
      <div className="bg-card rounded-[20px] border border-ink/10 shadow-[0_20px_50px_-30px_rgba(20,32,46,.35)] overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light">
          <h2 className="font-display font-bold text-[19px] text-text-primary flex items-center gap-2.5">
            <Info className="w-4 h-4 text-accent" />
            Hakkında
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-text-secondary leading-relaxed">
            ilac360, Türkiye'de ruhsatlı ilaçlar arasındaki olası etkileşimleri kontrol etmenizi
            sağlayan ücretsiz ve açık kaynaklı bir araçtır. Birden fazla ilaç kullanıyorsanız —
            ya da yakınınızın ilaç listesini gözden geçiriyorsanız — riskli kombinasyonları
            doktor veya eczacınıza sormadan önce burada görebilirsiniz.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            Tüm arama ve analiz tarayıcınızda çalışır: seçtiğiniz ilaçlar, aradığınız hastalıklar
            veya sağlık bilgileriniz hiçbir sunucuya gönderilmez.
          </p>

          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[.15em] text-accent mb-3">
              Veri Seti
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="İlaç" value={drugCount} />
              <Stat label="Etkin Madde" value={ingredientCount} />
              <Stat label="ATC Kodu" value={atcCount} />
              <Stat label="Etkileşim Kuralı" value={ruleCount} />
            </div>
            <p className="text-[11px] text-text-muted mt-2">
              İlaç listesi TİTCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu) ürün verilerine dayanır
              {dataDate ? `; veri dosyaları en son ${dataDate} tarihinde derlenmiştir` : ''}.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[.15em] text-accent mb-3">
              Nasıl Çalışır
            </h3>
            <ul className="space-y-2.5 text-sm text-text-secondary leading-relaxed">
              <li className="flex gap-2.5">
                <Database className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Seçtiğiniz her ilacın etkin maddeleri bileşenlerine ayrılır; tuz ve ester
                  formları ana moleküle indirgenir (örneğin "amlodipin besilat" → amlodipin).
                </span>
              </li>
              <li className="flex gap-2.5">
                <Layers className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Her ilaç çifti önce madde bazlı kurallarla, ardından ATC ilaç sınıfı
                  kurallarıyla karşılaştırılır. Kurallar ONC yüksek öncelikli etkileşim
                  listesi, FDA/EMA ürün bilgileri ve klinik farmakoloji kaynaklarından derlenmiştir.
                </span>
              </li>
              <li className="flex gap-2.5">
                <FileText className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Eşleşen etkileşimler risk seviyesi ve açıklamasıyla listelenir. Kural
                  bulunamayan çiftler "güvenli" olarak değil, "bilinmiyor" olarak işaretlenir.
                </span>
              </li>
              <li className="flex gap-2.5">
                <ShieldAlert className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Ayrıca ilaç detayında, iki ilaç seçmeye gerek kalmadan alerji (örneğin
                  penisilin), gebelik, yaş sınırı, araç kullanımı ve besin/takviye
                  etkileşimi (örneğin warfarin ↔ K vitamini) konularında tekil uyarılar
                  gösterilir. Bu uyarılar FDA/EMA ürün etiketleri ve TİTCK kullanma
                  talimatlarından derlenmiştir.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Database className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Greyfurt, alkol, süt, kafein ve sarı kantaron gibi besin/içecekler
                  sepete eklenerek ilaçlarla etkileşimi sorgulanabilir; kutu barkodu
                  telefon kamerasıyla taranarak ilaç aramadan bulunabilir. İkisi de
                  üyelik gerektirmez ve tamamen cihazınızda çalışır.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[.15em] text-accent mb-3">
              Sınırlamalar
            </h3>
            <ul className="space-y-2 text-[13px] text-text-secondary leading-relaxed list-disc pl-5">
              <li>
                Analiz; doz, kullanım süresi, yaş, gebelik, böbrek/karaciğer fonksiyonu gibi
                kişisel faktörleri <strong>dikkate almaz</strong>. İlaç detayındaki gebelik,
                yaş ve araç kullanımı uyarıları da kişiselleştirilmiş değerlendirme değil,
                ürün etiketinden derlenen genel uyarılardır.
              </li>
              <li>
                Kural veritabanı en yaygın ve klinik olarak önemli etkileşimlere odaklanır;
                literatürdeki her etkileşimi kapsamaz. "Bilinmiyor" sonucu güvenli demek değildir.
              </li>
              <li>
                Besin ve takviye etkileşimleri (örneğin greyfurt, K vitamini) yalnızca ilaç
                detayındaki tekil uyarılar kadarıyla kapsanır; bu liste kapsayıcı değildir ve
                bir uyarının görünmemesi risk olmadığı anlamına gelmez. Bitkisel ürünlerin
                kendi aralarındaki ve ilaçlarla diğer etkileşimleri kapsam dışıdır.
              </li>
              <li>
                Veriler TİTCK listesinin belirli bir tarihteki kopyasıdır; piyasaya yeni çıkan
                ürünler gecikmeli yansıyabilir.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-100 bg-amber-50/30 dark-warn p-4">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-risk-medium shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-risk-medium warn-title">Yasal Uyarı</p>
                <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                  Bu araç tanı veya tedavi amacıyla kullanılamaz; sağlık profesyonelinin
                  değerlendirmesinin yerini tutmaz. İlaç başlama, bırakma veya değiştirme
                  kararlarını mutlaka doktorunuz veya eczacınızla birlikte alın. Burada bir
                  etkileşim görünmemesi, etkileşim olmadığı anlamına gelmez.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg-primary p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Hatalı bir sonuç mu gördünüz? Kod ve kural veritabanı açık kaynaklıdır;
                düzeltme önerilerinizi{' '}
                <a
                  href="https://github.com/ahmetyigits/ilac360/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  <Github className="w-3 h-3" /> GitHub üzerinden
                </a>{' '}
                iletebilirsiniz. Her etkileşim kuralının kaynağı veritabanında kayıtlıdır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card-inset px-3 py-2.5">
      <p className="font-display font-bold text-[19px] text-text-primary">{value}</p>
      <p className="font-mono text-[10.5px] uppercase tracking-[.08em] text-text-muted mt-0.5">{label}</p>
    </div>
  );
}
