# Katkı Rehberi

ilac360'a katkının en değerli iki biçimi: **etkileşim kuralı önerisi/düzeltmesi**
(özellikle eczacı ve hekimlerden) ve hata bildirimi. Kod katkıları da açıktır.

## Hızlı başlangıç

```bash
nvm use                 # Node 22 (.nvmrc)
npm run setup           # client bağımlılıkları
node scripts/build-data.mjs   # veri dosyalarını üret (Git LFS gerekir)
npm run dev             # http://localhost:5173
```

Test ve kalite kapıları (PR'dan önce hepsi geçmeli — CI da aynı sırayı koşar):

```bash
npm run lint
npm test
node scripts/smoke-test.mjs
node scripts/lint-rules.mjs
node scripts/rules-coverage.mjs --min 95
```

## Etkileşim kuralı ekleme/düzeltme

Kurallar `data/interactions.json` içindedir. Her kural şu şemaya uyar
(`scripts/lint-rules.mjs` CI'da zorlar):

```json
{
  "id": "R-0220",
  "ingredientA": "warfarin",
  "ingredientB": "metronidazol",
  "risk": "high",
  "message": "Vatandaşın anlayacağı tek cümlelik Türkçe uyarı.",
  "details": "İsteğe bağlı ek açıklama.",
  "action": "İsteğe bağlı 'ne yapmalı' önerisi.",
  "evidence": "label",
  "source": "FDA etiketi (Flagyl)"
}
```

- `id`: `R-` + 4 hane, benzersiz; mevcut en büyük numaranın devamını kullanın.
- `risk`: `critical` | `high` | `medium` | `low`.
- `evidence`: `label` (FDA/EMA ürün etiketi) | `guideline` (resmî kılavuz/ONC) |
  `review` (derleme makalesi) | `expert` (klinik farmakoloji kaynağı).
- `source`: **zorunlu** — kuralın dayandığı somut kaynak.
- Etken madde adları Türkçe INN yazımıyla yazılır (`warfarin`, `kolşisin`).
  Veri setindeki yazım farklıysa `data/ingredient-synonyms.json`'a sinonim ekleyin;
  `node scripts/rules-coverage.mjs` eşleşmeyen tarafları raporlar.

**Kaynak kuralı (lisans):** FDA/EMA etiketleri, ONC listesi ve klasik literatür
serbesttir. CC-BY-NC kaynaklardan (DDInter, CredibleMeds vb.) veri **alınmaz** —
ticari kullanım olasılığıyla çelişir. Ayrıntı: `data/LICENSE-DATA.md`.

Sınıf-düzeyi kurallar (`ATC sınıfı × ATC sınıfı`) kodda tanımlıdır:
`client/src/data/categoryRules.js`. QT uzatma etiketleri ve SNRI gibi ATC'den
türetilemeyen sınıflar: `data/component-classes.json` (her girdide `source` zorunlu).

## Aylık veri yenileme

TİTCK export'unu güncelleme akışı tek komutla raporlanır ve insan onayıyla
uygulanır: bkz. [docs/data-refresh-runbook.md](docs/data-refresh-runbook.md).

## Hata bildirimi

GitHub Issues üzerinden; yanlış etkileşim sonucu bildiriyorsanız iki ilacın tam
adını (veya barkodunu) ve beklediğiniz sonucu yazın.
