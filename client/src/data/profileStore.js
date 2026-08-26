// Kişiye göre değerlendirme için hasta profili — localStorage'da saklanır.
// Backend yok (gizlilik ilkesi korunur). listsStore/basketStore ile aynı savunmacı
// try/catch deseni. Profil YALNIZ ilgili uyarıları ÖNE ÇIKARMAK için kullanılır;
// hiçbir uyarı gizlenmez.

const KEY = 'profile_v1';

const SEX = new Set(['k', 'e']);
const AGE = new Set(['bebek', 'cocuk', 'ergen', 'yetiskin', 'yasli']);

// Ham nesneyi güvenli/normalize profile çevir. Gebe/emziren yalnız kadında anlamlı.
export function normalizeProfile(p) {
  const src = p && typeof p === 'object' ? p : {};
  const sex = SEX.has(src.sex) ? src.sex : null;
  return {
    sex,
    ageBand: AGE.has(src.ageBand) ? src.ageBand : null,
    pregnant: sex === 'k' ? !!src.pregnant : false,
    breastfeeding: sex === 'k' ? !!src.breastfeeding : false,
  };
}

export function getProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return normalizeProfile(null);
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return normalizeProfile(null);
  }
}

export function setProfile(p) {
  const n = normalizeProfile(p);
  try {
    localStorage.setItem(KEY, JSON.stringify(n));
  } catch {
    // kota/gizli mod — sessiz geç
  }
  return n;
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // sessiz geç
  }
  return normalizeProfile(null);
}
