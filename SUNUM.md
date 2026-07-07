# ilac360 — Sunum Anlatımı

**Proje:** ilac360 — Türkiye İlaç Etkileşim Kontrol Sistemi
**Geliştirici:** Ahmet Yiğit
**Canlı:** https://ilac360.com
**Süre:** ~10-15 dakika sunum + soru-cevap

---

## SUNUM YAPISI ÖZET

| # | Bölüm | Süre | Slayt Sayısı |
|---|---|---|---|
| 1 | Açılış & Problem | 1 dk | 1-2 |
| 2 | Çözüm | 1 dk | 1 |
| 3 | Demo | 3-4 dk | (canlı) |
| 4 | Teknoloji ve Mimari | 2 dk | 2-3 |
| 5 | Veri ve Algoritma | 2 dk | 2-3 |
| 6 | Mühendislik Kararları | 1-2 dk | 1-2 |
| 7 | Sayısal Sonuçlar | 1 dk | 1 |
| 8 | Sınırlar ve Geleceği | 1 dk | 1 |
| 9 | Kapanış | 30 sn | 1 |

**Toplam:** ~12-15 slayt, ~12 dakika.

---

## 1. AÇILIŞ — PROBLEM (~1 dakika)

### Slayt: "Bir Sorun"

> "Herkesin başına geliyor: doktora gidiyorsunuz, üç ilaç yazılıyor. Eczaneye uğradınız, dört ilaç daha aldınız — kafa ağrısı için, gribiniz için. **Acaba bunların hepsi birlikte güvenli mi?**
>
> Eczacıya soruyorsunuz, çoğu zaman 'birlikte alabilirsiniz' diyor — ama detay yok. İnternete bakıyorsunuz, bulduğunuz araçlar İngilizce ve **'Parol' yazınca 'bilinmiyor' yazıyor.** Çünkü o araçlar ABD veya İngiltere marka isimlerini biliyor; Türkiye'de satılan **20.000'den fazla ilacı tanımıyor.**
>
> İşte bu boşluğu kapatmak için **ilac360**'ı geliştirdim."

### Vurgu noktaları:
- Gerçek bir problem (kullanıcıyla bağ kur)
- Mevcut çözümlerin yetersizliği
- Türkiye pazarı odağı

---

## 2. ÇÖZÜM — TEK CÜMLELİK PİTCH (~30 saniye)

### Slayt: "ilac360 Nedir?"

> "ilac360, Türkiye'de satılan **20.000'den fazla ilaç** arasında **Türkçe arama** yapıp, seçtiğiniz ilaçlar arasında **olası etkileşimleri risk seviyeleriyle** anında gösteren, **tamamen ücretsiz ve açık kaynak** bir web uygulaması."

### Slaytta gösterilecek özellikler:
- ✓ 20.000+ Türk ilacı
- ✓ Marka adı, etkin madde veya barkod ile arama
- ✓ 80+ hastalık ile filtreleme
- ✓ 4 seviyeli risk (kritik / yüksek / orta / düşük)
- ✓ Tamamen tarayıcıda — sunucusuz, hesapsız
- ✓ Açık kaynak (MIT)

---

## 3. DEMO (~3-4 dakika)

**Canlı gösterim — ilac360.com**

### Senaryo 1: Marka adı ile arama (45 sn)
1. "Aspirin" yaz → otomatik tamamlama listesi düşsün
2. **Aspirin 100 mg**'ı seç
3. **"Coumadin 5 mg"** ekle (warfarin)
4. **Analiz Et** butonuna bas
5. **KRİTİK uyarı** çıkacak: "NSAID + Vitamin K antagonisti — ciddi kanama riski"

> "Burada gördüğünüz uyarı, sistemin sadece bir kural eşleştirmesi yapmadığını gösteriyor — **ATC kodu sınıflandırmasına** dayalı bir karar veriyor. Aspirin, M01A ATC kodlu bir NSAID; Coumadin ise B01AA ATC kodlu bir vitamin K antagonisti. Sistem bu iki sınıfı tanıyıp uyarıyor."

### Senaryo 2: Hastalığa göre arama (45 sn)
1. **"Hastalığa Göre Ara"** sekmesine geç
2. **"Hipertansiyon"** seç
3. Yüksek tansiyon ilaçları listelenir (ACE inhibitörü, ARB, beta bloker vb.)
4. Birkaçını sepete ekle (ör. **Coversyl** + **Diovan**)
5. Analiz Et → **YÜKSEK risk**: "ACE inhibitörü + ARB birlikte hiperkalemi/böbrek yetmezliği"

### Senaryo 3: Karanlık mod + yazdırma (30 sn)
1. Soldaki kenar çubuğundan karanlık mod'u aç
2. Sonuç ekranında **Yazdır** butonunu göster
3. Print preview'da temiz çıktı

### Senaryo 4: Mobil görünüm (30 sn) — opsiyonel
Tarayıcı dev tools'ta cihaz emülasyonu aç.

---

## 4. TEKNOLOJİ & MİMARİ (~2 dakika)

### Slayt: "Stack"

```
Frontend       React 19 + Vite + Tailwind CSS 4
Dil            JavaScript (ES Modules)
İkon           Lucide React
Veri           JSON (statik dosyalar)
Build          Node.js scripti (build-data.mjs)
Hosting        Statik (CDN — sunucusuz)
```

### Slayt: "Mimari — Sunucusuz Tasarım"

```
   Tarayıcı (React)
         │
         ▼
  /public/data/*.json  ← statik dosya
         │
         ▼
       CDN
```

> "Burada dikkatinizi çekmek istediğim şey: **arka uçta hiçbir şey yok.** Sunucu yok, veritabanı yok, API yok. Tüm 20.000 ilaç, tarayıcıya bir kez statik JSON olarak iniyor ve hesaplama orada yapılıyor.
>
> Bunun üç büyük faydası var:
> 1. **Gizlilik** — kullanıcının seçtiği ilaçlar hiçbir yere gitmiyor.
> 2. **Maliyet** — sıfır altyapı. Herhangi bir statik host'ta çalışıyor.
> 3. **Performans** — CDN edge'inden anında geliyor; ilk yüklemeden sonra arama lokalde 1 ms'nin altında."

---

## 5. VERİ HAZIRLAMA VE ALGORİTMA (~2 dakika)

### Slayt: "Veri Hazırlama Pipeline'ı"

```
TİTCK ham verisi (~50 MB)
        ↓
build-data.mjs (Node script)
        ↓
1. Etkin madde → en sık ATC kodu sözlüğü kurulur
2. Eksik ATC kodları backfill edilir  → ~4.940 kayıt iyileştiriliyor
3. Alan adları minify edilir (name→n, atc→t)  → ~5+ MB tasarruf
4. Geçersiz açıklamalar filtrelenir
        ↓
/public/data/drugs-index.json  (slim, < 3 MB gzip sonrası)
```

> "Burada en sevdiğim mühendislik kararı şu: kaynak veriyi indirdiğimde **5 binden fazla ilacın ATC kodu eksikti.** ATC kodu olmadan etkileşim motoru çalışmıyor.
>
> Çözüm: bir önceki geçişte, **aynı etkin maddeyi taşıyan başka ilaçların ATC kodlarına bakıp en sık görüleni eksik olanlara atadım.** Bu otomatik backfill ile yaklaşık 5.000 kayıt doldu. Manuel olsa haftalar sürerdi."

### Slayt: "Etkileşim Motoru — 5 Katmanlı Eleme"

```
İki ilaç çifti için:

  1. Aynı etkin madde? ────────────────► KRİTİK (Doz aşımı)
        ↓ hayır
  2. Kombine etkin maddede ortak? ────► YÜKSEK
        ↓ hayır
  3. El ile yazılmış kural? (~67) ────► Kuralın seviyesi
        ↓ hayır
  4. ATC sınıf kuralı? (~66) ────────► Kuralın seviyesi
        ↓ hayır
  5. Aynı ATC grubu? ─────────────────► ORTA
        ↓ hayır
                                       DÜŞÜK (bilinen kural yok)
```

> "Önemli ilkelerden biri: **erken çıkış (early return).** Çoğu durumda 1. veya 2. katmanda eşleşme buluyoruz, geri kalan katmanlar atlanıyor. Bu, hem hızlı hem öngörülebilir bir motor sağlıyor."

---

## 6. MÜHENDİSLİK KARARLARI (~1-2 dakika)

### Slayt: "Bilinçli Kararlar — 'Eklemediklerim'"

| Eklemedim | Neden? |
|---|---|
| Backend | Veriler statik. Sunucu = gereksiz maliyet ve karmaşıklık. |
| Veritabanı | 20K kayıt JSON'da yeterli. SQL/NoSQL aşırı tasarım olurdu. |
| Redux/Zustand | App state'i basit. `useState` + `useCallback` yeterli. |
| Fuzzy search kütüphanesi | Stratejik ranking yeterli, ~150 KB bundle tasarrufu. |
| React.memo | State ağacı küçük, render maliyeti zaten düşük. |

> "Bir junior geliştirici olarak en zor öğrendiğim şeylerden biri **bir şey eklememe disiplini.** Her popüler kütüphaneyi denemenin değil, **ihtiyaç doğmadan abstraction eklememe**nin daha değerli olduğunu bu projede gördüm."

### Slayt: "Performans Optimizasyonları"

- ✓ Türkçe karakter normalizasyonu (özel `turkishLower`)
- ✓ İndeksleme: 2 ayrı Map (id → ilaç, name → ilaç)
- ✓ Stratejik ranking: exact → startsWith → contains → ingredient
- ✓ 300 ms debounce ile her tuşa arama yapmama
- ✓ JSON alan adı minifikasyonu → ~5+ MB tasarruf
- ✓ Lazy loading: 45 MB açıklama dosyası sadece ihtiyaç olunca

---

## 7. SAYISAL SONUÇLAR (~1 dakika)

### Slayt: "Rakamlarla ilac360"

| Metrik | Değer |
|---|---|
| **İlaç kaydı** | ~20.000 |
| **Etkin madde** | ~3.500+ |
| **ATC backfill** | ~4.940 kayıt |
| **El ile etkileşim kuralı** | ~67 |
| **ATC sınıf kuralı** | 66 |
| **Hastalık eşlemesi** | 80+ |
| **React bileşeni** | 16 |
| **Bundle tasarrufu (minifikasyon)** | ~5+ MB |
| **Arama gecikmesi** | < 5 ms (debounce sonrası) |
| **İlk yükleme (gzip)** | < 3 MB |

---

## 8. SINIRLAR VE GELECEK (~1 dakika)

### Slayt: "Bilinen Sınırlar"

> "Bu projeyi kendi başına eleştirmek de önemli. Şu anki sınırlar:
>
> 1. **133 etkileşim kuralı** — klinik kapsam değil. Hukuki uyarı vurgulu.
> 2. **Otomatik test yok** — Vitest entegrasyonu öncelikli geliştirme adımı.
> 3. **TypeScript yok** — özellikle ilaç şeması için faydalı olurdu.
> 4. **Kurallar manuel küratör** — DrugBank gibi bir kaynakla otomatize etmek hedef.

### Slayt: "Yol Haritası"

- Otomatik testler (Vitest)
- TypeScript migrasyonu
- DrugBank entegrasyonu ile daha fazla kural
- PWA / offline mod
- Web Worker ile arama
- i18n (İngilizce)

---

## 9. KAPANIŞ (~30 saniye)

### Slayt: "Teşekkürler"

> "Özetle: ilac360, Türkiye pazarındaki bir boşluğu kapatmak için tasarlanmış, **gerçek kullanıcılara ulaşan, açık kaynak ve sunucusuz** bir web uygulaması.
>
> Kodlama tarafında öğrendiklerim: **veri hazırlama otomasyonunun değeri**, **erken çıkış algoritmalarının zarafeti**, ve **'eklememe' disiplininin önemi.**
>
> Canlı: **ilac360.com**
> Kaynak kod: **github.com/ahmetyigit/ilac360**
>
> Sorularınız?"

---

## ÖNGÖRÜLEN SORU-CEVAP

### Soru 1: "Neden React seçtin?"
> "Üç sebep: (1) Ekosistem çok geniş, problem çözerken takıldığım her noktada cevap bulabiliyorum. (2) Junior geliştirici pozisyonlarında en aranan kütüphane, sektörel uyum sağlamak istiyorum. (3) Component bazlı düşünmek, projenin 16 bileşenini bağımsız geliştirip test etmemi kolaylaştırdı."

### Soru 2: "20.000 ilaç tarayıcıda yavaşlamıyor mu?"
> "Aslında hayır. Üç sebebi var: (1) JSON dosyası gzip sonrası 3 MB'tan küçük, ki bu sıradan bir görsel boyutu. (2) İlk yüklemede `Map` ile id ve isim indekslerini kuruyorum, tam isim aramaları O(1). (3) Kısmi aramalar O(n) lineer ama 20K kayıtta < 5 ms — kullanıcı fark etmiyor. Fuzzy search kütüphanesi ekleseydim 150 KB bundle ağırlığı kazanır, 5 ms'lik gecikmeyi 3 ms'ye düşürürdüm — kötü trade-off."

### Soru 3: "Etkileşim kuralları doğru mu?"
> "Kuralları kendim küratörledim, ana farmakoloji kaynaklarına ve resmi prospektüslere dayanarak. Ama bu **tıbbi tavsiye değil** — sistemde hem ilk açılışta hem sonuç ekranında zorunlu uyarı var. Uzun vadeli hedefim, DrugBank gibi açık tıbbi veri tabanlarından programatik olarak kural çekmek."

### Soru 4: "Yarın milyon kullanıcı gelse?"
> "Mevcut mimari milyon kullanıcı için zaten hazır — CDN üzerinden statik dağıtım yapıyoruz, sunucu yok. Eğer kişiselleştirilmiş özellik eklemek gerekirse (örn. kayıtlı ilaç listesi) o zaman bir backend gerekir. Ama o özellik gelmeden eklemek gereksiz maliyet."

### Soru 5: "Test yazmadığını söyledin — neden?"
> "Bu projenin gerçek bir sınırı, kabul ediyorum. Sebepler: (1) Zaman önceliği — bitirip canlıya almayı öncelikledim. (2) Etkileşim motoru saf fonksiyonlar üzerine kurulu olduğu için sonradan test eklemek kolay. (3) Sıradaki sprint'te Vitest ile en azından `interactionEngine.js` için birim testleri ekleyeceğim."

### Soru 6: "Veriyi nereden aldın?"
> "TİTCK — Türkiye İlaç ve Tıbbi Cihaz Kurumu — resmi ürün listesinden. Ham veri ~50 MB; build sürecinde temizlik, ATC backfill ve minifikasyon adımlarından geçirip tarayıcıya optimize edilmiş halini gönderiyorum."

### Soru 7: "Bu projede en zorlandığın şey neydi?"
> "Eksik ATC kodları. Veri seti 20.000 kayıt; bunların 5.000'inde ATC eksikti. ATC olmadan etkileşim motoru çalışmıyor. Manuel düzeltmek imkansız. Çözüm: build sırasında, aynı etkin maddeli diğer kayıtlardan ATC'yi öğrenip eksik olanlara atayan bir algoritma yazdım. Bir öğleden sonra sürdü; veri probleminden öğrendiğim en değerli derslerden biri."

### Soru 8: "Açık kaynak yapmanın sebebi?"
> "Bir tane: bu tür araçların özel kalmaması gerektiğine inanıyorum. Sağlık bilgisi temel bir hak. İkincisi: pull request'ler hoş karşılanıyor — yeni etkileşim kuralları veya hastalık eşlemeleri katkı olarak gelebilir."

### Soru 9: "Neden Türkçe odaklı?"
> "Çünkü Türkiye'de bu ihtiyaca yönelik ücretsiz, kaliteli bir araç yoktu. Uluslararası araçlar 'Parol' yazınca tanımıyor. Pazarın bilinen bir boşluğunu doldurmak — junior bir projeden bekleyebileceğim en iyi başarı bu."

### Soru 10: "Bu projeden ne öğrendin?"
> "Üç şey: **(1)** Veri pipeline'ı, kullanıcıya görünmüyor ama projenin başarısının yarısı orada. **(2)** 'Hangi kütüphaneyi kullanacağım?' sorusundan önce 'kütüphaneye gerçekten ihtiyacım var mı?' sorusu gelmeli. **(3)** Ürünü canlıya almak ve gerçek kullanıcılarla test etmek, ne kadar mükemmel olduğunu beklemekten daha öğretici."

---

## SUNUM İPUÇLARI

### Sahnede
- **Demo'yu sunum öncesi mutlaka prova et** — internet kopması, ekran rezolüsyonu, vb.
- **Yedek senaryo hazırla**: internet yoksa, dist/ klasörünü lokal olarak `python -m http.server` ile aç.
- **Mobil cihazı yanında bulundur** — "responsive de çalışıyor" demek yerine göster.
- **Konuşurken kod ekranına bakmayı bırakma** — slayt değil, dinleyiciyle göz teması.

### Slayt tasarımı
- Tek slaytta tek fikir
- 6'dan fazla bullet kullanma
- Kod örneklerini büyük font ile, en fazla 6-8 satır
- Mimari diyagramı görsel olarak basit tut
- ilac360 renk paleti ile uyumlu (ana renk, accent)

### Soru-cevap
- Bilmiyorsan: **"Bunu düşünmedim — iyi bir soru. Şu an düşünecek olursam …"** — dürüstlük her zaman kazanır.
- Saldırgan soruya: önce **kabul et**, sonra **gerekçe ver**. ("Haklısınız, test yok. Bunun sebebi…")
- Yanlış varsayımlı soruya: önce **düzelt**, sonra cevapla.

---

## ÖZ DEĞERLENDİRME — BU PROJEYE NEDEN İNANIYORUM?

> "Yazılım geliştirme öğrenirken çoğu öğrenci 'todo app' veya 'weather app' yapıyor. Ben **gerçek bir kullanıcı problemine** odaklandım: Türkiye'de ücretsiz ilaç etkileşim aracı yok. Veriyi bulup işleyip, motoru kurup, arayüzü tasarlayıp canlıya aldım.
>
> Bu projede mühendislik mantığı kadar **karar verme disiplini** de öğrendim: hangi özelliği eklemeyeceğine karar vermek, hangi soyutlamayı yapmamak — bunlar gerçek hayatta kod yazmaktan daha önemli.
>
> ilac360 mükemmel değil — ama gerçek bir ürün ve gerçek kullanıcıları var. Beni en çok ilerletecek geliştirme deneyimi de bu oldu."
