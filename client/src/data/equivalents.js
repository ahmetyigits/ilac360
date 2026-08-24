// Eşdeğer ilaç grupları — MEVCUT veriden, ek indirme olmadan hesaplanır.
// Gruplama etken maddeye (sıralı kanonik bileşen kümesi) göredir; ATC kodu ise
// bir EŞLEŞME FİLTRESİ + SIRALAMA kriteridir, katı bir grup anahtarı değil.
// Böylece ATC kodu eksik ("0" veya 7 haneden kısa) ürünler de eşdeğerlerini
// gösterebilir. ("Amlodipin Besilat" ve "amlodipin" tuz ayıklama + sinonimlerle
// birleşir.)
//
// ATC yapısı: 1. hane anatomik grup, 3. haneye kadar terapötik alt grup,
// 5. hane KİMYASAL ALT GRUP (rota/form ailesi), 7. hane kimyasal madde.
// İki tarafın da geçerli ATC'si varsa ilk 5 hane eşitliği aranır; bu, aynı
// etken maddenin farklı rota/form (oral vs topikal) sürümlerinin karışmasını
// engeller. Taraflardan biri ATC'siz ise uyumlu sayılır.
//
// ÖNEMLİ: Bu, etkin madde + ATC eşleşmesine dayalı FARMASÖTİK bir gruplamadır;
// doz/form farkları olabilir ve resmî SGK eşdeğer listesi DEĞİLDİR. UI bu
// ibareyi her zaman gösterir.

import { getDrugs, getDrugById } from './drugStore.js';
import { componentKey } from './ingredientMatcher.js';
import { getSynonymLookup } from './interactionEngine.js';

let groupsByComp = null; // componentKey -> [drugId]
let compById = null;     // drugId -> componentKey
let atcById = null;      // drugId -> geçerli 7 haneli ATC | null

export function resetEquivalentsIndex() {
  groupsByComp = null;
  compById = null;
  atcById = null;
}

// Geçerli (7 haneli, "0" olmayan) ATC kodunu döndürür, yoksa null.
function validAtc(drug) {
  const atc = (drug.ATC_code || '').trim();
  return atc && atc !== '0' && atc.length >= 7 ? atc : null;
}

// İki ATC (veya null) uyumlu mu? Biri eksikse uyumlu; ikisi de doluysa aynı
// 5 haneli kimyasal alt grup (rota/form ailesi) şart.
function atcCompatible(a, b) {
  if (!a || !b) return true;
  return a.slice(0, 5) === b.slice(0, 5);
}

// Sıralama önceliği (küçük = önce): tam ATC eşleşmesi > aynı 5-ön ek >
// kanonik (ATC'li) kardeş > ATC'siz kardeş.
function rankOf(selfAtc, a) {
  if (selfAtc && a) return selfAtc === a ? 0 : 1;
  if (!selfAtc) return a ? 0 : 1; // kendisi ATC'siz: ATC'li (kanonik) kardeşi öne al
  return 2; // kendisi ATC'li, kardeş ATC'siz
}

function buildIndex() {
  const synonymLookup = getSynonymLookup();
  groupsByComp = new Map();
  compById = new Map();
  atcById = new Map();
  for (const drug of getDrugs()) {
    const key = componentKey(drug.Active_Ingredient, synonymLookup);
    if (!key) continue; // bileşeni çözülemeyen ürün gruplanmaz
    compById.set(drug.ID, key);
    atcById.set(drug.ID, validAtc(drug));
    let group = groupsByComp.get(key);
    if (!group) {
      group = [];
      groupsByComp.set(key, group);
    }
    group.push(drug.ID);
  }
}

/**
 * Bir ilacın eşdeğerlerini (kendisi hariç) döndürür.
 * Aynı etken madde kümesi + uyumlu ATC (bkz. atcCompatible); tam/uygun
 * eşleşenler önce gelir.
 * Çağırmadan önce loadDrugs() ve loadInteractions() tamamlanmış olmalıdır
 * (api.getEquivalents bunu garanti eder).
 */
export function getEquivalentIds(id, { limit = 12 } = {}) {
  if (!groupsByComp) buildIndex();
  const sid = String(id);
  const key = compById.get(sid);
  if (!key) return [];
  const selfAtc = atcById.get(sid) || null;
  const group = groupsByComp.get(key) || [];
  const scored = [];
  for (const gid of group) {
    if (gid === sid) continue;
    const a = atcById.get(gid) || null;
    if (!atcCompatible(selfAtc, a)) continue;
    scored.push({ gid, rank: rankOf(selfAtc, a) });
  }
  scored.sort((x, y) => x.rank - y.rank); // stabil sıralama; eşitlikte veri sırası korunur
  return scored.slice(0, limit).map((s) => s.gid);
}

export function getEquivalentDrugs(id, opts) {
  return getEquivalentIds(id, opts)
    .map((gid) => getDrugById(gid))
    .filter(Boolean);
}
