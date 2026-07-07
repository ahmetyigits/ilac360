# Proje Analiz ve Tasarım Raporu
## ilac360 — Türkiye için İlaç Etkileşim Kontrol Sistemi

Ahmet Yiğit — 212132034

---

## 1. GİRİŞ

ilac360, Türkiye'de satılan ilaçlar arasındaki etkileşimleri hızlıca kontrol etmeye yarayan bir web uygulamasıdır. Kullanıcı kullandığı ilaçları seçer, sistem bu ilaçların birlikte alındığında risk oluşturup oluşturmadığını gösterir. Uygulama tamamen tarayıcı üzerinde çalışır; kayıt olmak, hesap açmak veya internet üzerinden bir sunucuya bilgi göndermek gerekmez.

### 1.1 AMAÇ

Projenin amacı, hastaların ve eczacıların kullandıkları ilaçlar arasında olası etkileşimleri kolayca öğrenebilecekleri, **Türkçe** ve **Türkiye pazarındaki ilaçları tanıyan** bir araç sunmaktır. Mevcut uluslararası araçlar genellikle ABD veya İngiltere merkezli marka isimlerini kullandığı için, Türkiye'de reçete edilen birçok ilacı tanımıyor. ilac360 bu boşluğu doldurmak için tasarlandı.

### 1.2 KAPSAM

Proje şunları içerir:

- Türkiye İlaç ve Tıbbi Cihaz Kurumu (TİTCK) verilerine dayalı 20.000'den fazla ilaç ürününün aranabilir bir listesi
- Marka adı, etkin madde veya barkod ile ilaç arama
- 80'den fazla hastalık/endikasyona göre ilaç arama
- Aynı anda en fazla 10 ilacın seçilip karşılaştırılması
- Etkin madde ve ATC kodu eşlemesine dayalı etkileşim analizi
- Dört seviyeli risk değerlendirmesi: **kritik, yüksek, orta, düşük**
- Yazdırılabilir rapor çıktısı
- Karanlık mod desteği

Teslim edilecekler: çalışan web uygulaması, kaynak kodları, kullanılan veri setleri, proje raporu, sunum dosyası ve kullanım kılavuzu.

### 1.3 TANIMLAR VE KISALTMALAR

- **Etkin Madde:** Bir ilacın tedavi edici etkisini sağlayan kimyasal bileşendir. Aynı etkin madde farklı marka isimleriyle satılabilir (örn. parasetamol → Parol, Calpol, Tamol).
- **ATC Kodu:** Dünya Sağlık Örgütü'nün ilaçları sınıflandırmak için kullandığı uluslararası koddur. Aynı ATC sınıfındaki ilaçlar benzer şekilde davranır.
- **Etkileşim:** İki veya daha fazla ilacın birlikte alındığında birbirinin etkisini değiştirmesidir.
- **TİTCK:** Türkiye İlaç ve Tıbbi Cihaz Kurumu. Resmi ilaç verisinin kaynağıdır.
- **React:** Arayüzün geliştirildiği JavaScript kütüphanesidir.
- **Vite:** Projenin geliştirme ve derleme aracıdır.
- **Tailwind CSS:** Arayüz stillemesi için kullanılan CSS çatısıdır.

---

## 2. GENEL TANIM

Sistem, kullanıcının seçtiği ilaçları aldıktan sonra, bunların etkin maddelerini çıkarıp önceden hazırlanmış etkileşim kuralları içinde arayan bir mantıkla çalışır. Eşleşme bulunduğunda, etkileşimin risk seviyesi ve açıklaması kullanıcıya gösterilir.

### 2.1 SİSTEM YAPISI

Uygulama tamamen **istemci taraflı (client-side)** çalışır. Yani arka planda Python ya da Node.js gibi bir sunucu, ya da MySQL/SQLite gibi bir veritabanı yoktur. Tüm ilaç verisi ve etkileşim kuralları, build sırasında JSON dosyalarına dönüştürülüp tarayıcıya statik dosya olarak gönderilir. Bu sayede:

- Kullanıcı verisi hiçbir sunucuya gitmez (gizlilik avantajı)
- Sunucu maliyeti yoktur, herhangi bir statik hosting yeterlidir
- İnternet bağlantısı bir kez sayfa yüklendikten sonra zorunlu değildir

**Kullanılan teknolojiler:**

| Bileşen | Teknoloji |
|---|---|
| Programlama dili | JavaScript (ES Modules) |
| Arayüz kütüphanesi | React 19 |
| Geliştirme/Derleme aracı | Vite |
| Stilleme | Tailwind CSS |
| İkonlar | Lucide React |
| Veri formatı | JSON |
| Veri hazırlama | Node.js (scripts/build-data.mjs) |
| Geliştirme ortamı | macOS |

**Veri akışı:**

1. Kullanıcı arama kutusuna yazar → React bileşeni `searchDrugs` fonksiyonunu çağırır
2. Fonksiyon, tarayıcıda yüklü olan `drugs-index.json` dosyası içinde arama yapar
3. Sonuçlar listelenir, kullanıcı seçim yapar
4. "Analiz Et" butonuna basıldığında etkileşim motoru (`interactionEngine.js`) çalışır
5. Motor, seçilen ilaçların etkin maddelerini ikili olarak `interactions.json` içinde arar
6. Bulunan etkileşimler, risk seviyesine göre sınıflandırılıp ekrana basılır

### 2.1.1 KULLANICI ARAYÜZLERİ

Kullanıcılar uygulamaya doğrudan tarayıcı üzerinden erişir. Giriş ekranı veya kullanıcı kaydı yoktur; site açılır açılmaz arama yapılabilir.

### 2.1.1.1 AKTÖRLER / ROLLER

Sistemde tek bir aktör tanımlıdır:

**KULLANICI**
İlaç araması yapan, ilaç seçen ve etkileşim sonucunu görüntüleyen kişidir. Hasta, hasta yakını veya eczacı olabilir. Sistemde ek yetki seviyeleri yoktur, çünkü uygulama veri yazmıyor; sadece okuyup hesaplama yapıyor.

> Not: Yönetici / bilgi işlem rolüne ihtiyaç duyulmamasının sebebi, etkileşim kurallarının ve ilaç verisinin doğrudan kaynak depo (repository) üzerinden güncellenmesidir. Yani veri güncellemesi, kullanıcı arayüzünden değil, geliştirici tarafından yeni bir build alınarak yapılır.

### 2.1.1.2 EKRAN YAPILARI VE ÖZELLİKLERİ

Uygulama tek sayfalık (SPA) bir yapıdadır; menü değişimleri sayfa yenilemesi olmadan yapılır.

**Ana Ekran (Etkileşim Kontrolü)**
İki sekmeli bir alandan oluşur:
- **İlaç Ara** sekmesi: Kullanıcı marka adı, etkin madde veya barkod yazar.
- **Hastalığa Göre Ara** sekmesi: Kullanıcı bir endikasyon seçer (ör. "yüksek tansiyon"), sistem o hastalıkta kullanılan ilaçları listeler.

Aramanın yanında "Seçilen İlaçlar" paneli vardır. Kullanıcı en fazla 10 ilaç ekleyebilir. İki veya daha fazla ilaç seçildiğinde "Analiz Et" butonu aktif olur.

**Etkileşim Sonuç Ekranı**
Analiz tamamlandıktan sonra açılır. Bulunan her etkileşim:
- Hangi iki ilaç arasında olduğu
- Risk seviyesi (kritik/yüksek/orta/düşük) renkli rozet ile
- Kısa açıklama
- Detaylı açıklama (genişletilebilir)

şeklinde gösterilir. Sonuç ekranında sonuçları risk seviyesine göre filtreleme ve **yazdırma** seçenekleri vardır.

**İlaç Detay Kartı**
Bir ilacın yanındaki bilgi simgesine tıklanınca açılır. Etkin madde, ATC kodu, kategoriler ve prospektüs metni burada görüntülenir.

**Hakkında Sayfası**
Toplam ilaç sayısı, kayıtlı etkileşim kuralı sayısı gibi istatistikler ile veri kaynağı bilgisi yer alır.

**Hukuki Uyarı**
Site ilk açıldığında ve sonuç ekranında, sistemin tıbbi tavsiye yerine geçmediği, doktor/eczacıya danışılması gerektiği uyarısı gösterilir.

### 2.2 SİSTEM FONKSİYONLARI

Sistemin temel fonksiyonları:

1. **İlaç Arama:** Marka adı, etkin madde veya barkod ile arama. Türkçe karakter normalizasyonu ve 300 ms gecikmeli tetikleme (debounce) uygulanır.
2. **Hastalık Bazlı Arama:** 80+ endikasyon için, o hastalıkla ilişkilendirilmiş ilaçların listelenmesi.
3. **İlaç Seçimi:** En fazla 10 ilacın seçilip "sepet" benzeri bir alanda tutulması.
4. **Etkileşim Analizi:** Seçilen ilaçların ikili kombinasyonlarının etkin madde eşlemesi ile etkileşim kuralları içinde aranması.
5. **Risk Sınıflandırması:** Her etkileşimin kritik / yüksek / orta / düşük olarak işaretlenmesi.
6. **Sonuç Sunumu:** Etkileşimlerin gruplanıp, filtrelenebilir ve yazdırılabilir biçimde gösterilmesi.
7. **İlaç Detayı Görüntüleme:** Seçili veya aranan ilacın prospektüs ve sınıflandırma bilgilerinin gösterilmesi.
8. **Karanlık Mod:** Tema tercihinin localStorage'da saklanması.

### 2.3 SİSTEM YÖNETİMİ

Sistem statik dosyalardan oluştuğu için ayrı bir yönetim paneli yoktur. Veri güncellemeleri (yeni ilaçların eklenmesi, etkileşim kurallarının düzenlenmesi) `data/` klasöründeki JSON dosyaları üzerinde yapılır; ardından `npm run build:data && npm run build` komutu çalıştırılarak yeni sürüm üretilir ve hosting'e yüklenir.

### 2.4 KISITLAR, VARSAYIMLAR VE BAĞLILIKLAR

**Kısıtlar / Bağımlılıklar:**

- Uygulama, Node.js ortamında derlenmek zorundadır (Vite ve npm gerekli).
- Kaynak ilaç verisi TİTCK kaynaklıdır; eksik olan ATC kodları etkin madde adına bakılarak tamamlanmaktadır.
- Etkileşim kuralları el ile küratörlenmiştir (otomatik çekilmiyor); bu yüzden kapsam, kuralların güncelliğine bağlıdır.
- Sistem, modern tarayıcı (Chrome, Safari, Firefox, Edge güncel sürümleri) gerektirir.

**Varsayımlar:**

- Kullanıcının temel internet ve tarayıcı kullanım bilgisine sahip olduğu varsayılmaktadır.
- Etkin madde eşlemesinin, etkileşim tespiti için yeterince güvenilir olduğu kabul edilmiştir. Aynı etkin maddeyi içeren farklı marka ilaçlar, etkileşim açısından eşdeğer kabul edilir.
- Kullanıcının uygulamayı tıbbi tavsiye olarak değil, doktora danışmadan önce bir farkındalık aracı olarak kullanacağı varsayılır. Hukuki uyarı bu yüzden öne çıkarılmıştır.

---

## 3. SİSTEM TASARIMI

### 3.1 AKTİVİTE DİYAGRAMI

Aşağıda kullanıcının tipik kullanım akışı tarif edilmiştir. Bu akışın diyagramı raporun görsel ekinde verilecektir.

```
[Site açılır]
    ↓
[Hukuki uyarı gösterilir]
    ↓
[Kullanıcı: ilaç ara veya hastalığa göre ara]
    ↓
[Sonuçlar listelenir]
    ↓
[Kullanıcı ilaç ekler] ── (10'a kadar) ──┐
    ↓                                     │
[2+ ilaç var mı?] ── Hayır ──┐            │
    ↓ Evet                    │            │
[Analiz Et butonu aktif]      └────────────┘
    ↓
[Etkileşim motoru çalışır]
    ↓
[İkili kombinasyonlar etkileşim kurallarında aranır]
    ↓
[Sonuçlar risk seviyesine göre sıralanır]
    ↓
[Kullanıcı sonuçları görüntüler / filtreler / yazdırır]
```

### 3.2 BİLEŞEN MİMARİSİ

```
┌─────────────────────────────────────────┐
│        Tarayıcı (React Uygulaması)       │
│                                          │
│  ┌──────────────┐    ┌────────────────┐  │
│  │  DrugSearch  │    │ ConditionSearch│  │
│  └──────┬───────┘    └────────┬───────┘  │
│         │                     │          │
│         └──────────┬──────────┘          │
│                    ▼                     │
│         ┌──────────────────┐             │
│         │  SelectedDrugs   │             │
│         └────────┬─────────┘             │
│                  ▼                       │
│         ┌──────────────────┐             │
│         │ interactionEngine│             │
│         └────────┬─────────┘             │
│                  ▼                       │
│         ┌──────────────────┐             │
│         │InteractionResults│             │
│         └──────────────────┘             │
└─────────────────────────────────────────┘
            ▲
            │ statik dosyalar
            │
┌─────────────────────────────────────────┐
│   /public/data/                          │
│   - drugs-index.json    (ilaç listesi)   │
│   - drugs-descriptions  (prospektüs)     │
│   - interactions.json   (kurallar)       │
│   - condition-mapping   (hastalık eşlemesi)│
└─────────────────────────────────────────┘
```

---

## 4. PROJE PLANI

| Çalışma | İçerik |
|---|---|
| **Analiz Çalışması** | Sistem gereksinimlerinin, veri kaynaklarının (TİTCK ilaç listesi) ve çıktının (etkileşim raporu) belirlenmesi. Kullanıcı ihtiyaçlarının çıkarılması. |
| **Tasarım Çalışması** | React tabanlı arayüzün ekran tasarımları, bileşen hiyerarşisi, veri akışının planlanması. |
| **Gerçekleştirim Çalışması** | Vite ile proje kurulumu, ilaç veri setinin işlenip JSON'a dönüştürülmesi, arama ve etkileşim motorunun yazılması, arayüz bileşenlerinin React ile geliştirilmesi. |
| **Test Çalışması** | Bilinen ilaç çiftleri ile etkileşim motorunun doğrulanması, arama performansının ölçülmesi, farklı tarayıcılarda denenmesi, mobil uyumluluğunun kontrolü. |
| **Danışman Teslimi** | Belirlenen tarihler arasında danışmana teslim. |
| **Sunum** | Belirlenen tarihler arasında projenin sunulması. |

**Açıklamalar:**

1. Gerçekleştirim aşamasının en kritik adımı, ham TİTCK verisinin işlenip arama yapılabilir hale getirilmesidir. Bu işlem `scripts/build-data.mjs` betiği ile otomatikleştirilmiştir.
2. Etkileşim kuralları el ile küratörlendiği için, test aşamasında mevcut kuralların doğruluğu kadar, kapsamının ne olduğu da raporlanmalıdır.
3. Uygulamanın sunucu/veritabanı gerektirmemesi, kurulum ve dağıtımı önemli ölçüde basitleştirmiştir; bu da proje takvimini olumlu etkilemiştir.
