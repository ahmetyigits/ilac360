> **Arşiv** — Bu belge Mayıs 2026 durumunu yansıtır ve güncel değildir; güncel bilgi için kök README ve docs/ altına bakın.

# ilac360 — Teknik Rapor

**Proje:** ilac360 — Türkiye İlaç Etkileşim Kontrol Sistemi
**Geliştirici:** Ahmet Yiğit (212132034)
**Canlı:** https://ilac360.com
**Lisans:** MIT
**Tarih:** 2026

---

## 1. ÖZET

ilac360, Türkiye pazarında satılan 20.000+ ilaç ürünü için ücretsiz, açık kaynaklı bir ilaç-ilaç etkileşim kontrol uygulamasıdır. Mevcut uluslararası araçlar Türkiye'de reçete edilen marka isimlerinin çoğunu tanımadığından, bu boşluğu kapatmak amacıyla geliştirilmiştir. Uygulama **tamamen istemci taraflıdır**: sunucu, veritabanı, kullanıcı hesabı veya internet bağlantısı (ilk yükleme sonrası) gerektirmez.

**Temel sayısal göstergeler:**

| Metrik | Değer |
|---|---|
| Toplam ilaç kaydı | ~20.000 |
| Eşsiz etkin madde | (build sırasında hesaplanıyor, ~3.500+) |
| Eşsiz ATC kodu | (build sırasında hesaplanıyor) |
| Hastalık eşlemesi | 80+ endikasyon |
| El ile küratörlenmiş etkileşim kuralı | ~67 kural (`data/interactions.json`) |
| ATC sınıf bazlı etkileşim kuralı | 66 kural (`interactionEngine.js` içinde) |
| Risk seviyesi | 4 (kritik / yüksek / orta / düşük) |
| Maksimum eş zamanlı analiz | 10 ilaç |
| Etkileşim algoritması karmaşıklığı | O(n²/2), n ≤ 10 → en fazla 45 karşılaştırma |
| React bileşeni | 16 |
| Veri modülü | 4 (drugStore, interactionEngine, conditionSearch, api) |
| ATC backfill başarısı | ~4.940 ilaç (etkin madde eşleşmesiyle) |

---

## 2. TEKNOLOJİ YIĞINI

| Katman | Teknoloji | Sürüm |
|---|---|---|
| Dil | JavaScript (ES Modules) | ES2022+ |
| UI kütüphanesi | React | 19 |
| Build aracı | Vite | 8 |
| Stil | Tailwind CSS | 4 |
| İkon kütüphanesi | Lucide React | — |
| Veri formatı | JSON (statik) | — |
| Veri hazırlama | Node.js (≥20) | ES Modules |
| Lint | ESLint + plugin-react-hooks + plugin-react-refresh | — |
| Çalışma ortamı | Modern tarayıcılar (Chrome, Safari, Firefox, Edge) | — |
| Geliştirme platformu | macOS | — |

**Kullanılmayanlar (bilinçli tercih):**
- ❌ Backend (Node.js/Express, Django, vb.)
- ❌ Veritabanı (PostgreSQL, MongoDB, SQLite, IndexedDB)
- ❌ Redux / Zustand / MobX gibi state yönetim kütüphaneleri
- ❌ TypeScript (gelecek geliştirme için aday)
- ❌ Birim/entegrasyon testleri (gelecek geliştirme için aday)
- ❌ CI/CD (GitHub Actions vb.)

---

## 3. MİMARİ

### 3.1 Yüksek Seviye Mimari

```
┌─────────────────────────────────────────────────────────┐
│              Tarayıcı (React 19 + Vite)                 │
│                                                         │
│   ┌──────────────────────────────────────────────┐      │
│   │              UI Katmanı (16 bileşen)         │      │
│   │  Hero · TopBar · Sidebar · DrugSearch        │      │
│   │  ConditionSearch · SelectedDrugs · DrugCard  │      │
│   │  InteractionResults · Toast · ErrorBoundary  │      │
│   └─────────────────┬────────────────────────────┘      │
│                     │                                   │
│   ┌─────────────────▼────────────────────────────┐      │
│   │             Veri Erişim Katmanı              │      │
│   │  drugStore.js (arama, normalizasyon)         │      │
│   │  interactionEngine.js (etkileşim motoru)     │      │
│   │  conditionSearch.js (hastalık eşlemesi)      │      │
│   │  api.js (loader cephe)                       │      │
│   └─────────────────┬────────────────────────────┘      │
└─────────────────────┼───────────────────────────────────┘
                      │ fetch (lazy)
                      ▼
┌─────────────────────────────────────────────────────────┐
│            /public/data/ (statik JSON)                  │
│  drugs-index.json         ~2–3 MB (gzip ile küçülür)    │
│  drugs-descriptions.json  ~45 MB (lazy load)            │
│  interactions.json        küçük (~67 kural)             │
│  condition-mapping.json   küçük (~80 endikasyon)        │
└─────────────────────────────────────────────────────────┘
                      ▲
                      │ npm run build:data
                      │
┌─────────────────────┴───────────────────────────────────┐
│       scripts/build-data.mjs (Node.js script)           │
│  Ham TİTCK verisi → normalize → minify → output         │
└─────────────────────────────────────────────────────────┘
                      ▲
                      │
┌─────────────────────┴───────────────────────────────────┐
│     /data/ (kaynak veri — version control)              │
│  ilaclar-dataset.json    ham TİTCK ürün listesi         │
│  interactions.json       el ile küratörlenmiş kurallar  │
│  condition-mapping.json  hastalık → ilaç sınıfı         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Dosya Yapısı

```
ilac-etkilesim-projesi/
├── client/                      # Vite + React uygulaması
│   ├── public/
│   │   └── data/                # build-data.mjs'nin çıktısı
│   ├── src/
│   │   ├── App.jsx              # Ana bileşen, state yönetimi
│   │   ├── main.jsx             # Vite entry point + ErrorBoundary
│   │   ├── index.css            # Tailwind ana CSS
│   │   ├── components/          # 16 React bileşeni
│   │   │   ├── DrugSearch.jsx
│   │   │   ├── ConditionSearch.jsx
│   │   │   ├── SelectedDrugs.jsx
│   │   │   ├── DrugCard.jsx
│   │   │   ├── InteractionResults.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── TopBar.jsx · Sidebar.jsx · Footer.jsx
│   │   │   ├── LegalWarning.jsx · Onboarding.jsx
│   │   │   ├── Toast.jsx · Pagination.jsx
│   │   │   ├── MatchSourceModal.jsx · AboutPage.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   ├── data/                # Veri/iş mantığı modülleri
│   │   │   ├── drugStore.js     # Arama, normalizasyon, indeksleme
│   │   │   ├── interactionEngine.js   # Etkileşim algoritması
│   │   │   ├── conditionSearch.js     # Hastalık → ilaç eşlemesi
│   │   │   └── api.js           # Loader/cephe API'si
│   │   └── pages/
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── tailwind.config.js
│   └── package.json
├── data/                        # Kaynak veri (build girdisi)
│   ├── ilaclar-dataset.json     # Ham TİTCK ilaç listesi
│   ├── interactions.json        # El ile küratörlenmiş kurallar
│   └── condition-mapping.json   # Hastalık → ilaç sınıfı eşlemesi
├── scripts/
│   ├── build-data.mjs           # Veri işleme/minimize pipeline
│   └── smoke-test.mjs           # Dağıtım öncesi smoke test
├── dist/                        # Üretim build çıktısı
├── PROJE-RAPORU.md
├── TEKNIK-RAPOR.md              # Bu dosya
├── README.md
├── LICENSE                      # MIT
└── package.json
```

---

## 4. VERİ MİMARİSİ

### 4.1 Kaynak Veri

| Dosya | İçerik | Boyut Tahmini |
|---|---|---|
| `data/ilaclar-dataset.json` | TİTCK kökenli ham ilaç ürün listesi | ~50 MB |
| `data/interactions.json` | El ile yazılmış etkin madde çiftleri (ingredientA + ingredientB → risk, mesaj) | < 50 KB |
| `data/condition-mapping.json` | 80+ endikasyon → ilgili etkin madde / ATC kodu / kategori eşlemesi | < 100 KB |

### 4.2 Build Pipeline (`scripts/build-data.mjs`)

Node.js scripti, kaynak veriyi okuyup tarayıcıya optimize edilmiş JSON üretir:

**Adım 1 — Etkin madde → en sık ATC kodu sözlüğünün kurulması:**
- Tüm geçerli ATC kodlarına sahip kayıtlar taranır.
- Her etkin madde için ATC frekans haritası oluşturulur.
- Her etkin maddeye **en sık gözlenen ATC kodu** atanır (modal).

**Adım 2 — Kayıt başına işleme:**
- Etkin madde temizliği (`isValidIngredient`): "etken maddesi bilgisi bulunamadı", `-`, `—` gibi geçersiz değerler `null`'a çevrilir.
- ATC kodu yoksa Adım 1'deki sözlükten **backfill** yapılır (~4.940 kayıt iyileştiriliyor).
- Prospektüs (`Description`): 50 karakterden kısa veya "içerik bulunamadı" gibi marker içerenler filtrelenir.
- Kategoriler temizlenir (boş ve "Yok" filtrelenir).

**Adım 3 — Alan adı minifikasyonu:**
Tarayıcıya gönderilen JSON'da alan adları tek harfe indirgenir:
```js
{
  i: id,                  // ID
  n: Product_Name,        // name
  a: Active_Ingredient,   // active ingredient
  t: ATC_code,            // therapeutic code
  b: barcode,
  c: [...categories],     // categories
  h: hasDescription       // boolean
}
```
20.000+ kayıt × 7 alan adı × ortalama 8 karakter tasarrufu = **~5+ MB indirim**. Tarayıcıda `expand()` fonksiyonu (`drugStore.js:39-54`) bu kayıtları orijinal alan adlarına geri açar.

**Adım 4 — Çıktı:**
- `drugs-index.json` (slim, kritik yol)
- `drugs-descriptions.json` (lazy load — ~45 MB)
- `interactions.json` (verbatim kopya)
- `condition-mapping.json` (verbatim kopya)

### 4.3 Lazy Loading Stratejisi

- **drugs-index.json**: Site açılır açılmaz yüklenir (arama için gerekli).
- **drugs-descriptions.json**: ~45 MB. Sadece kullanıcı bir ilaç kartını açtığında veya hastalık aramasında prospektüs fallback'ı tetiklendiğinde indirilir (`drugStore.js:209-237`).
- **interactions.json**: Etkileşim motoru ilk çağrıldığında yüklenir, sonra cache'lenir.

Tüm yükleyiciler **promise-singleton** desenini kullanır: aynı anda iki istek yapılsa bile fetch yalnızca bir kez gerçekleşir (`loadPromise = loadPromise ?? fetch(...)`).

---

## 5. ARAMA MOTORU

### 5.1 Türkçe Karakter Normalizasyonu (`turkishLower`)

```js
"İLAÇ" → "ilaç"
"BAŞAĞRISI" → "başağrısı"
```
JavaScript'in yerleşik `toLowerCase()` fonksiyonu Türkçe büyük `İ`'yi yanlış küçültür (`i̇` ile birleşik nokta üretir). Bu yüzden özel bir normalizasyon kullanılıyor.

### 5.2 Arama Akışı (`searchDrugs`)

1. Sorgu **6+ haneli sayıysa** → **barkod araması** (ilaç kutusu üzerindeki EAN/UPC barkod).
2. Aksi halde:
   - Tüm ilaç adları üzerinde **tek geçişte** üç gruba sınıflandırılır:
     - **Exact match** (`nameL === q`)
     - **Starts with** (`nameL.startsWith(q)`)
     - **Contains** (`nameL.includes(q)`)
   - Toplam sonuç limitin altındaysa, ek olarak **etkin madde** alanında arama yapılır.
3. Sonuçlar **öncelik sırasına göre birleştirilir** ve `cleanDrugResponse` ile temizlenip döndürülür.

### 5.3 İndeksleme

İlk yükleme sırasında iki Map kurulur:
- `drugsById` — `Map<id, drug>` → O(1) lookup
- `drugsByNameLower` — `Map<normalizedName, drug>` → O(1) tam isim lookup

20.000 kayıtlık tam ad listesinde lineer tarama O(n) hâlâ < 5 ms olduğu için **fuzzy search kütüphanesi (Fuse.js vb.) eklenmedi** — gereksiz kompleksite ve bundle ağırlığı. (~150 KB tasarruf.)

### 5.4 Debounce

`DrugSearch` bileşeninde **300 ms debounce** uygulanır: kullanıcı yazmayı bıraktıktan 300 ms sonra arama tetiklenir. Her tuş vuruşunda 20K kayıt taraması yapılmaz.

---

## 6. ETKİLEŞİM MOTORU

### 6.1 Algoritma (5 katmanlı eleme)

Seçili `n` ilaç için tüm ikili kombinasyonlar (`n*(n-1)/2`) sırasıyla 5 katmandan geçer. Her katman bir eşleşme bulursa **kalan katmanlar atlanır**.

| Katman | Kontrol | Risk |
|---|---|---|
| **1** | Aynı etkin madde (normalize edilmiş tam eşleşme) | **critical** ("Doz aşımı riski!") |
| **2** | Kombine etkin madde içinde ortak kelime (ör. "parasetamol + kodein" ↔ "parasetamol") | **high** |
| **3** | El ile yazılmış kural (`interactions.json` içinde ingredientA/B çifti) | kuralın belirttiği seviye |
| **4** | ATC sınıf bazlı kural (`CATEGORY_INTERACTIONS` — NSAID + Warfarin gibi) | kuralın belirttiği seviye |
| **5a** | Aynı 4-karakterli ATC grubu (ör. `C09A`) | **medium** |
| **5b** | Aynı 3-karakterli ATC terapötik grubu (ör. `C09`) | **medium** |
| **Fallback** | Hiçbir kural eşleşmedi | **low** ("Bilinen etkileşim yok, klinik değerlendirme önerilir") |

### 6.2 ATC Sınıflandırması

`ATC_CATEGORY_MAP` (`interactionEngine.js:50-105`) 56 ATC öneki için kategori atar:
- `M01A` → NSAID
- `B01AA` → VITAMIN_K_ANTAGONIST (warfarin vb.)
- `N06AB` → SSRI
- `N02A` → OPIOID
- `J01MA` → FLUOROQUINOLONE
- vs.

Bir ilaç birden fazla kategoriye girebilir (`getAllCategories`); etkileşim taramasında **kategori çiftleri** üzerinden eşleşme aranır.

### 6.3 Kategori Bazlı Kural Örnekleri

Toplam **66 ATC sınıf kuralı** (`CATEGORY_INTERACTIONS`):
- `SSRI + MAOI` → **critical** (Serotonin sendromu)
- `BENZODIAZEPINE + OPIOID` → **critical** (Solunum depresyonu, ölüm riski)
- `NSAID + VITAMIN_K_ANTAGONIST` → **critical** (Ciddi kanama)
- `STATIN + ANTIFUNGAL_SYSTEMIC` → **critical** (Rabdomiyoliz)
- `MACROLIDE + ANTIARRHYTHMIC_III` → **critical** (QT uzaması, ölümcül aritmi)
- vs.

### 6.4 Çıktı Formatı

```js
{
  interactions: [
    {
      drug1: "Aspirin 100 mg",
      drug2: "Coumadin 5 mg",
      risk: "critical",
      message: "NSAID ve warfarin/kumarin birlikte kullanımı ciddi kanama riskini çok artırır.",
      details: "Asetilsalisilik asit (NSAID) ↔ Varfarin sodyum (VITAMIN_K_ANTAGONIST)"
    },
    ...
  ],
  unknownDrugs: []  // veritabanında bulunamayan kullanıcı sorguları
}
```

Sonuçlar **risk seviyesine göre sıralanır** (critical → high → medium → low).

---

## 7. STATE YÖNETİMİ

### 7.1 Stratejik Karar

**Redux, Zustand, Context API kullanılmadı.** App.jsx içinde `useState` ile 11 state, `useCallback` ile bellek-optimized callback'ler tutuluyor (`App.jsx:20-99`).

**Gerekçe**: Uygulama state'i basit ve büyük ölçüde **localized**. Global state ihtiyacı yok. "İhtiyaç doğmadan abstraction ekleme" prensibine sadık kalındı (YAGNI).

### 7.2 App.jsx State Yapısı

```js
currentView          // 'checker' | 'about'
searchMode           // 'drug' | 'condition'
selectedDrugs        // Drug[]  (max 10)
activeDrug           // Drug | null  (kartı açık olan)
interactions         // Interaction[] | null
unknownDrugs         // string[]  (bulunamayan sorgular)
analysisLoading      // bool
stats                // { totalDrugs, uniqueIngredients, uniqueAtcCodes }
toasts               // Toast[]
darkMode             // bool  (localStorage'da kalıcı)
```

### 7.3 Side Effects

| Etki | Mekanizma |
|---|---|
| Dark mode tercihini kaydet | `useEffect` + `localStorage` (`App.jsx:39-42`) |
| Sistem tema tercihi fallback | `window.matchMedia('(prefers-color-scheme: dark)')` |
| Toast'ları 4 sn sonra kapat | `setTimeout` + `setToasts` (filter id) |
| İstatistikleri yükle | `useEffect` ile `getStats()` |

---

## 8. ERİŞİLEBİLİRLİK (a11y)

- **ARIA**: `aria-label`, `role="combobox"`, `role="listbox"`, `aria-autocomplete="list"` (`DrugSearch.jsx:112-129`)
- **Klavye desteği**:
  - **Ctrl+K** → Arama kutusuna fokus (global kısayol)
  - **Yukarı / Aşağı oklar** → Öneri listesinde gezinme
  - **Enter** → Seçim
  - **Esc** → Aktif kart/modal kapatma
- **Karanlık mod**: Sistem tercihi otomatik algılanır, manuel toggle ile geçersiz kılınabilir.
- **Görsel hiyerarşi**: Renk + ikon + metin (renk körlüğü için yalnız renge dayanmıyor).
- **Mobil uyumlu**: Tailwind responsive utility'leri ile breakpoint bazlı düzen.
- **Error Boundary**: Bir bileşen patlasa bile uygulama tamamen çökmüyor (`main.jsx:9`).

---

## 9. PERFORMANS

### 9.1 Bundle ve Veri Optimizasyonları

| Optimizasyon | Etki |
|---|---|
| Alan adı minifikasyonu (`name` → `n` vb.) | ~5+ MB tasarruf |
| Açıklamalar lazy load (~45 MB) | İlk açılış 1-2 sn yerine yarım saniye |
| Vite tree-shake + code splitting | Otomatik |
| Gzip/Brotli (CDN seviyesinde) | JSON ~70-80% küçültme |
| `Map` ile O(1) ID/name lookup | 20K kayıt → < 1 µs lookup |
| Etkileşim arama erken çıkış (5 katman) | Çoğu durumda 1-2 katmanda eşleşme |

### 9.2 Render Optimizasyonları

- `useCallback` ile prop fonksiyonlarının referans kararlılığı.
- Debounce (300 ms) ile arama tetiklemesi.
- React 19 otomatik batching.
- **React.memo kullanılmadı** — state ağacı küçük olduğundan gereksiz.

### 9.3 Network

- Tek seferlik kritik yükleme: `drugs-index.json` (~2-3 MB gzip sonrası).
- Açıklamalar lazy.
- Static asset → CDN edge cache → tekrar yüklemede 0 ms.

---

## 10. GÜVENLİK & GİZLİLİK

| Konu | Yaklaşım |
|---|---|
| Kullanıcı verisi | **Hiçbir sunucuya gönderilmez.** Tüm hesaplama tarayıcıda. |
| Kullanıcı hesabı | Yok. Site açılır açılmaz kullanım. |
| Çerez / tracking | Yok. Analitik bile yok. |
| Hukuki uyarı | Site ilk açılışta ve sonuç ekranında zorunlu görüntülenir (`LegalWarning.jsx`). |
| HTTPS | Hosting tarafında zorunlu (Hostinger / Netlify default). |
| XSS | React varsayılan escaping. `dangerouslySetInnerHTML` kullanılmıyor. |
| Bağımlılık güvenliği | npm audit önerileri takip ediliyor; runtime bağımlılık az sayıda. |

---

## 11. KOD ÖRGÜTLENMESİ

### 11.1 Modül Bağımlılık Grafiği

```
main.jsx
 └── ErrorBoundary
      └── App.jsx
           ├── api.js (cephe)
           │    ├── drugStore.js
           │    │    └── (turkishLower, flexibleIncludes, Map indexes)
           │    ├── interactionEngine.js
           │    │    ├── drugStore.js
           │    │    └── ATC_CATEGORY_MAP + CATEGORY_INTERACTIONS
           │    └── conditionSearch.js
           │         └── drugStore.js
           └── components/ (16 bileşen)
```

### 11.2 Tasarım İlkeleri

- **Veri katmanı ile UI ayrıştırılmış**: İş mantığı `data/` altında; bileşenler bunları yalın çağırıyor.
- **Pure functions önce**: `turkishLower`, `normalizeIngredient`, `getCategory` saf fonksiyonlar (test edilebilir).
- **Singleton loader pattern**: Aynı dosya iki kez fetch edilmez.
- **Cephe (Facade) deseni**: `api.js` UI'a düz fonksiyonlar sunar; alt katmanı gizler.
- **Erken çıkış (early return)**: Etkileşim motorunda 5 katmanlı eleme zinciri.

---

## 12. KISITLAR VE BİLİNEN SINIRLAR

1. **Etkileşim kuralları sınırlı**: ~67 + 66 = 133 toplam kural. Klinik kapsam değil. Hukuki uyarı vurgulu.
2. **Otomatik test yok**: Kritik etkileşim motoru testlerinin gelecekte Vitest ile eklenmesi planlanıyor.
3. **TypeScript yok**: İlaç şeması için tip güvenliği faydalı olurdu. Refactor adayı.
4. **CI/CD yok**: Yeni veri sürümü için `npm run build` el ile çalıştırılır.
5. **İnteraksiyon kuralları manuel küratör**: DrugBank gibi bir veri kaynağı entegrasyonu uzun vadeli hedef.
6. **Sadece JS — Web Workers kullanılmıyor**: 20K kayıt main thread'de tarandığından çok seyrek de olsa UI jank riski (şu an performans yeterli).
7. **Açıklama dosyası ~45 MB**: Lazy load yapıldı ama yine de ilk aktivasyonda 2-3 sn yükleme.

---

## 13. DAĞITIM

### 13.1 Build

```bash
cd ilac-etkilesim-projesi
npm run build
```

Bu komut:
1. `scripts/build-data.mjs` ile veri pipeline'ı çalıştırır.
2. `client/` altında `npm install` + `vite build`.
3. Çıktıyı `client/dist/`'e yazar, sonra **kök `dist/`'e kopyalar**.

### 13.2 Hosting

`dist/` içeriği herhangi bir statik host'a yüklenir:
- Netlify
- Vercel
- GitHub Pages
- Hostinger (şu an kullanılan)
- AWS S3 + CloudFront
- Cloudflare Pages

**Runtime gerektirmez.** Sunucu maliyeti yok.

### 13.3 Domain

`ilac360.com` — Türkiye'de erişilebilir.

---

## 14. GELİŞTİRME REHBERİ

```bash
# İlk kurulum
git clone <repo>
cd ilac-etkilesim-projesi/client
npm install

# Veri pipeline'ını çalıştır (kök dizinden)
cd ..
npm run build:data

# Dev server (Vite, port 5173)
npm run dev

# Üretim build'i
npm run build
```

Gereklilikler: Node.js ≥ 20.

---

## 15. GELECEKTEKİ İYİLEŞTİRMELER

| Öncelik | İyileştirme | Tahmini Çaba |
|---|---|---|
| Yüksek | Vitest ile etkileşim motoru testleri | 1-2 gün |
| Yüksek | TypeScript migrasyonu (en azından `data/`) | 3-5 gün |
| Orta | Daha fazla etkileşim kuralı (DrugBank entegrasyonu) | 1-2 hafta |
| Orta | Service Worker + offline-first PWA | 2-3 gün |
| Orta | Web Worker ile arama (UI jank riskini sıfıra indirme) | 1 gün |
| Düşük | i18n (İngilizce arayüz) | 1 hafta |
| Düşük | Yan etki / kontrendikasyon modülü | belirsiz |
| Düşük | Reçete OCR ile barkod tarama | belirsiz |

---

## 16. KAYNAKLAR

- **Veri kaynağı**: Türkiye İlaç ve Tıbbi Cihaz Kurumu (TİTCK) ürün listesi
- **ATC sınıflandırması**: WHO Anatomical Therapeutic Chemical kodlama sistemi
- **React 19 dokümantasyon**: https://react.dev
- **Vite**: https://vitejs.dev
- **Tailwind CSS**: https://tailwindcss.com

---

**Son güncelleme:** 2026
**Geliştirici:** Ahmet Yiğit — 212132034
**Açık kaynak:** MIT Lisansı
**Canlı:** https://ilac360.com
