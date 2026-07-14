# Veri Lisansı Notu

Bu depodaki **kod** MIT lisanslıdır (kök dizindeki `LICENSE`). Bu lisans
**`data/` altındaki veri dosyalarını kapsamaz**; veri ayrı koşullara tabidir:

## `data/ilaclar-dataset.json` (TİTCK ürün verisi)

Türkiye İlaç ve Tıbbi Cihaz Kurumu'nun (TİTCK) kamuya açık ruhsatlı ürün
listesinden derlenmiştir. Kamu kurumu verisidir; ancak yeniden dağıtım ve
ticari kullanım koşulları TİTCK tarafından belirlenir ve zaman içinde
değişebilir. **Bu dosyayı yeniden dağıtmadan veya ticari bir üründe
kullanmadan önce güncel TİTCK kullanım koşullarını doğrulayın.** Bu depo,
veri üzerinde herhangi bir hak iddia etmez.

## `data/interactions.json`, `data/component-classes.json` ve türevleri

Etkileşim kuralları ve sınıf etiketleri; FDA/EMA ürün etiketleri, ONC yüksek
öncelikli etkileşim listesi ve klasik klinik farmakoloji literatüründen
**elle derlenmiştir** (her kayıtta `source` alanı vardır). Derleme MIT
kapsamındadır; ancak CC-BY-NC gibi ticari kullanımı kısıtlayan kaynaklardan
(örn. DDInter, CredibleMeds) bilinçli olarak **hiç veri alınmamıştır** ve
alınmamalıdır — katkı verirken bu kurala uyun.
