// Hasta profili → ilgili uyarı tipleri. Kesin yaş eşiği (minAge/maxAge) verisi
// yok; kategori düzeyinde çalışır (gebelik/emzirme/pediatrik). Yalnız ÖNE ÇIKARMA
// içindir; hiçbir uyarı gizlenmez.

const PEDIATRIC_BANDS = new Set(['bebek', 'cocuk', 'ergen']);

const SEX_LABEL = { k: 'Kadın', e: 'Erkek' };
const AGE_LABEL = {
  bebek: 'Bebek (0-2 yaş)',
  cocuk: 'Çocuk (2-12 yaş)',
  ergen: 'Ergen (12-18 yaş)',
  yetiskin: 'Yetişkin',
  yasli: 'Yaşlı (65+)',
};

// Profile göre ilgili uyarı `type` kümesi (drug-warnings.json tipleriyle hizalı).
export function relevantWarningTypes(profile) {
  const set = new Set();
  if (!profile) return set;
  if (profile.pregnant) set.add('pregnancy');
  if (profile.breastfeeding) set.add('lactation');
  if (PEDIATRIC_BANDS.has(profile.ageBand)) set.add('age');
  return set;
}

export function isProfileSet(profile) {
  return !!(profile && (profile.sex || profile.ageBand || profile.pregnant || profile.breastfeeding));
}

// Yaşlı profili prospektüsün "Yaşlılarda kullanımı" bölümüne yönlendirilir
// (uyarı verisi geriatrik tip taşımıyor; özel-durum çipi üzerinden).
export function isGeriatric(profile) {
  return !!(profile && profile.ageBand === 'yasli');
}

export function profileSummary(profile) {
  if (!isProfileSet(profile)) return '';
  const parts = [];
  if (profile.sex && SEX_LABEL[profile.sex]) parts.push(SEX_LABEL[profile.sex]);
  if (profile.ageBand && AGE_LABEL[profile.ageBand]) parts.push(AGE_LABEL[profile.ageBand]);
  if (profile.pregnant) parts.push('Gebe');
  if (profile.breastfeeding) parts.push('Emziren');
  return parts.join(' · ');
}

export { AGE_LABEL, SEX_LABEL };
