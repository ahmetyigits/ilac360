# İlaç 360 — Mimari

Tarayıcıda çalışan, backend'siz bir ilaç etkileşim denetleyicisi. Tüm veri bir
kez yüklenir ve sorgular cihazda çalışır. Bu belge veri akışını, modül
sınırlarını, etkileşim motorunun çözümleme sırasını ve build hattını özetler.

## Katmanlar

```
data/*.json  ──(scripts/build-data.mjs)──▶  client/public/data/*.<hash>.json + manifest.json
   (kaynak)                                        (içerik-hash'li, dağıtılan)
                                                          │
                                                    client/src/data/*  (yükleyici + motor)
                                                          │
                                                    client/src/components/*  (React UI)
```

- **Kaynak veri** (`data/`): elle kürasyonlu + TİTCK türevi. Büyük dosyalar
  (`ilaclar-dataset.json` 52 MB, `titck-kt-texts.json` 108 MB) Git LFS'te.
- **Build** (`scripts/build-data.mjs`): kaynağı doğrular, takviye kataloğunu
  ilaç index'ine enjekte eder (id 9000001+), bileşen→ATC haritasını üretir,
  prospektüsleri barkodla bağlar, içerik-hash'li JSON + `manifest.json` yazar.
- **İstemci veri katmanı** (`client/src/data/`): saf JS modülleri; `api.js`
  cephedir, store'lar (`drugStore`, `interactionEngine`, ...) memoize edilmiş
  yükleme promise'leriyle önbellek görevi görür.
- **UI** (`client/src/components/`): React 19, tek-sayfa durum makinesi
  (`App.jsx`); router yok, deep-link parametreleri (`?d=`, `?drug=`) var.

## Temel veri dosyaları

| Dosya | İçerik |
|---|---|
| `ilaclar-dataset.json` | ~20.5k ürün (barkod, ATC, etken madde, ad, kategori, KT) |
| `interactions.json` | ~277 bileşen-çifti kuralı (kaynak + evidence + action zorunlu) |
| `component-classes.json` | bileşen → sınıf etiketi + QT durumu (ATC'den türetilemeyenler: SNRI, bitkiseller, serotonerjik...) |
| `component-atc-overrides.json` | bileşen → ATC elle düzeltme (yanlış/eksik ATC'yi zorlar) |
| `ingredient-synonyms.json` | yazım/varyant → kanonik bileşen |
| `drug-warnings.json` | ATC-prefix/etken-madde → tekil ilaç uyarısı (gebelik, besin, alerji...) |
| `condition-mapping.json` | hastalık/şikayet → aday etken maddeler |
| `supplement-products.json` | takviye edici gıda kataloğu (build'de enjekte edilir) |
| `food-items.json` | besin/içecek etkileşim anahtarları (greyfurt, alkol, k-vitamini...) |

## Etkileşim motoru — çözümleme sırası

`interactionEngine.js` her ilaç çifti için İLK eşleşen dalda durur (`continue`):

1. **Besin × ilaç** — `drug-warnings.json` foodKeys (besin × besin kapsam dışı).
2. **Ortak etken madde** (doz aşımı) — aynı/örtüşen bileşen; yardımcı maddeler
   (`adjuvant-components.json`) hariç.
3. **Bilinen çift kuralı** — `interactions.json` (kaynak + evidence taşır → UI'da
   kartta gösterilir).
4. **Sınıf kuralı** — `categoryRules.js` `CATEGORY_INTERACTIONS`; en YÜKSEK riskli
   eşleşme kazanır. Sınıflar ATC'den (`ATC_CATEGORY_MAP`) + bileşenden
   (`component-atc.json`, `component-classes.json`) türetilir.
5. **Additive-QT** — ≥2 QT ajanı; ≥3'te risk bir seviye yükselir.
6. **Additive-serotonin** — ≥3 serotonerjik ajan (spesifik kural yoksa) → orta.
7. **Additive-hipotansiyon** — ≥3 kan basıncı düşüren ajan → düşük (≥4'te orta).
8. **Aynı ATC alt grubu** — etkileşim değil, bilgilendirme.
9. **Yalnız yardımcı madde paylaşımı** — düşük seviyeli not.
10. **Bilinmiyor** — kural yok; "güvenli DEĞİLDİR" mesajı (sessiz boşluk yok).

**Additive modeller** (QT/serotonin/hipotansiyon) sınıf-çifti kuralı değil,
motorun ajan SAYACIyla çalışır; kategorileri `categoryRules.js`'teki
`SEROTONERGIC_CATEGORIES` / `BP_LOWERING_CATEGORIES` kümelerinde tanımlıdır
(lint-rules bunları "ölü kategori" saymaz). Topikal/oftalmik formlar
(`formDetect.js`) bu sayaçlara ve sistemik sınıflara katılmaz.

## Kalite kapıları (CI + elle)

`lint-rules` (kural şeması + kategori tutarlılığı) · `lint-supplements` (takviye
kataloğu + her token'ın kanonik üretmesi) · `lint-warnings` · `rules-coverage
--min 95` (her kuralın iki tarafı gerçek üründe eşleşmeli) · `smoke-test` (veri
bütünlüğü) · vitest (motor + UI) · `test:coverage` (bilgilendirici).

Bkz. [data-refresh-runbook.md](data-refresh-runbook.md) (aylık veri yenileme),
[deploy-hostinger.md](deploy-hostinger.md) (yayın).

## İstemci durum & yükleme

- `App.jsx`: `currentView` (checker/about) + `searchMode` (drug/condition);
  sepet, kayıtlı listeler (`listsStore.js`), favoriler, tema, otomatik analiz.
- `bootData()` ilaç index'i + kuralları + durumları paralel ısıtır.
- `drugStore`: kompakt `drugs-index.json` (~5.8 MB, kısaltılmış alanlar) bir kez
  yüklenir; arama alanları önceden foldlanır (her tuşta O(n) düz karşılaştırma).
  Prospektüs metinleri kart açılınca hash-kovasından (`drugs-desc-NN`) lazy gelir.
- PWA: app shell precache; veri + WASM runtime-cache (CacheFirst/NetworkFirst).
