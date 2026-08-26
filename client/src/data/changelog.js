// Sürüm / yenilik notları — "Yenilikler" sayfasında gösterilir.
// YENİ SÜRÜM EKLERKEN: en yeni girişi dizinin BAŞINA ekle. Her değişiklik için
// isteğe bağlı `tag: 'YENİ' | 'İYİLEŞTİRME' | 'DÜZELTME'` kullanılabilir.

export const CHANGELOG = [
  {
    date: '2026-08-26',
    title: 'Reçete tipi, kişiye göre değerlendirme ve kaynak linkleri',
    summary:
      'İlaçlar için reçete tipi rozeti (kırmızı/yeşil/izlemeye tabi), yaş-cinsiyet profiline göre uyarı önceliklendirme ve ilaç detayında resmi TİTCK prospektüs linki eklendi.',
    changes: [
      {
        tag: 'YENİ',
        title: 'Reçete tipi rozeti',
        desc: 'İlaçlar TİTCK resmî renkli reçete listelerine göre rozetleniyor: kırmızı reçete (narkotik — morfin, fentanil, metilfenidat…), yeşil reçete (psikotrop — benzodiazepinler, pregabalin, tramadol…) ve normal reçete–izlemeye tabi (gabapentin, kodein kombinasyonları…). Ürün/barkod bazlıdır; kaynak listenin tarihi ve resmî liste linki kartta gösterilir.',
      },
      {
        tag: 'YENİ',
        title: 'Kişiye göre değerlendirme',
        desc: 'Cinsiyet, yaş bandı ve gebe/emziren bilgisini girince ilaca ait ilgili uyarılar (gebelik, emzirme, pediatrik) öne çıkarılıp "Bu profil için" rozetiyle vurgulanıyor. Hiçbir uyarı gizlenmez; yalnız önceliklendirilir.',
      },
      {
        tag: 'YENİ',
        title: 'Resmi prospektüs (KT) linki',
        desc: 'İlaç detayında "TİTCK\'de oku" linkiyle ürünün resmi Kullanma Talimatı\'na (prospektüs PDF) doğrudan ulaşabilirsiniz — 8.000+ üründe. Doktor/eczacı orijinali kaynağından okuyabilir.',
      },
    ],
  },
  {
    date: '2026-08-24',
    title: 'Büyük içerik güncellemesi',
    summary:
      'Besin etkileşimleri, tek ilaç uyarıları ve çok daha fazla bitkisel/takviye etkileşimi eklendi; her uyarının kaynağı artık ekranda.',
    changes: [
      {
        tag: 'YENİ',
        title: 'Besin & içecek etkileşimleri',
        desc: 'İlaçların yanına besin/içecek ekleyip kontrol edebilirsiniz: greyfurt, alkol, süt/kalsiyum, kafein, K vitamini, tiramin (peynir vb.), potasyum ve sarı kantaron. Örn. greyfurt–statin, süt–antibiyotik, tiramin–MAO inhibitörü.',
      },
      {
        tag: 'YENİ',
        title: 'Tek ilaç seçilince uyarılar',
        desc: 'Tek bir ilaca bakınca bile ürün etiketinden derlenmiş uyarılar çıkıyor: gebelik, emzirme, alerji, besinle alım, kullanım şekli, araç kullanımı, yaş sınırı ve takviye notları — kaynağıyla birlikte.',
      },
      {
        tag: 'YENİ',
        title: 'Çoklu ilaç (polifarmasi) uyarıları',
        desc: 'Aynı yönde etki eden 3+ ürün birikince kümülatif uyarı: tansiyon düşürenler → ortostatik hipotansiyon/düşme riski; serotonerjik ilaçlar → serotonin sendromu riski.',
      },
      {
        tag: 'YENİ',
        title: 'Bitkisel & takviye etkileşimleri genişledi',
        desc: 'Çörek otu (kan şekeri), saw palmetto / reishi / bromelain / at kestanesi / çuha çiçeği yağı (kanama), ashwagandha (tiroid + sedasyon), kelp (iyot/tiroid), astragalus & spirulina (bağışıklık), zeytin yaprağı & L-arginin (tansiyon) ve daha fazlası — hepsi kaynaklı eklendi.',
      },
      {
        tag: 'YENİ',
        title: 'Her uyarının kaynağı ekranda',
        desc: 'Her etkileşimin yanında kanıt düzeyi ve kaynağı (FDA/EMA ürün etiketi, klinik kılavuz vb.) görünüyor.',
      },
      {
        tag: 'İYİLEŞTİRME',
        title: 'Daha fazla ilaç doğru tanınıyor',
        desc: 'Farklı yazım/form yüzünden gözden kaçan bazı etkin maddeler (morphine, düşük molekül ağırlıklı heparinler ve diğerleri) artık doğru sınıflanıyor; yanlış eşleşen bir madde de düzeltildi.',
      },
      {
        tag: 'YENİ',
        title: 'Kullanım kolaylıkları',
        desc: 'İlaç listenizi isimlendirip kaydedin, sık kullandıklarınızı favorileyin, hastalığa göre ararken yazdıkça anında sonuç alın, isterseniz otomatik analizi açın.',
      },
      {
        tag: 'İYİLEŞTİRME',
        title: 'Eşdeğer ilaçlar daha kapsamlı',
        desc: 'Bir ilaca bakınca altındaki "Eşdeğer İlaçlar" listesi artık ATC kodu olmayan ürünlerde de aynı etken maddeli alternatifleri gösteriyor (oral/topikal gibi farklı formlar karıştırılmadan). Binlerce üründe daha önce boş kalan eşdeğer listesi artık dolu.',
      },
      {
        tag: 'DÜZELTME',
        title: 'Beslenme ürünlerindeki hatalı ilaç etiketi düzeltildi',
        desc: 'Bazı enteral/oral beslenme (FSMP) ürünleri kaynak veride yanlışlıkla bir ilaç etken maddesiyle etiketlenmiş ve sahte etkileşim/eşdeğer üretiyordu; bu ürünler temizlendi.',
      },
      {
        tag: 'İYİLEŞTİRME',
        title: 'Etkileşim mekanizması ekranda vurgulu',
        desc: 'Her etkileşimde "neden, hangi enzim/taşıyıcı üzerinden, neyi artırıp azalttığı ve hangi soruna yol açtığı" artık kartta ayrı bir "Mekanizma" başlığıyla görünüyor — hekim ve eczacı için daha anlaşılır.',
      },
    ],
  },
];
