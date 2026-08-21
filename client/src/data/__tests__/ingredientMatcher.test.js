import { describe, it, expect, beforeAll } from 'vitest';
import {
  normalizeText,
  splitComponents,
  stripSalt,
  getComponents,
  buildSynonymLookup,
} from '../ingredientMatcher.js';

describe('normalizeText', () => {
  it('Türkçe büyük harfleri doğru indirger (İ→i, I→i katlaması)', () => {
    expect(normalizeText('İBUPROFEN')).toBe('ibuprofen');
    expect(normalizeText('IBUPROFEN')).toBe('ibuprofen');
    expect(normalizeText('Parasetamol')).toBe('parasetamol');
    expect(normalizeText('ŞĞÜÖÇ')).toBe('şğüöç');
  });

  it('parantezli notları ve fazla boşlukları temizler', () => {
    expect(normalizeText('  Parasetamol  (mikronize) ')).toBe('parasetamol');
    expect(normalizeText('Budesonid (inhalasyon için)')).toBe('budesonid');
  });

  it('bozuk kayıtları (serileştirilmiş dict) reddeder', () => {
    expect(normalizeText("{'deger': 'Potasyum Klorür', 'tip': 'x'}")).toBeNull();
    expect(normalizeText('[1,2]')).toBeNull();
  });

  it('geçersiz/placeholder etken maddeleri reddeder', () => {
    expect(normalizeText('Etken maddesi bilgisi bulunamadı.')).toBeNull();
    expect(normalizeText('BİLİNMİYOR')).toBeNull();
    expect(normalizeText('bilinmiyor')).toBeNull();
    expect(normalizeText('-')).toBeNull();
    expect(normalizeText('')).toBeNull();
    expect(normalizeText(null)).toBeNull();
  });
});

describe('splitComponents', () => {
  it('virgül, artı, bölü, noktalı virgül ve "ve" ile böler', () => {
    expect(splitComponents('parasetamol, asetilsalisilik asit, kafein')).toEqual([
      'parasetamol', 'asetilsalisilik asit', 'kafein',
    ]);
    expect(splitComponents('metronidazol/mikonazol nitrat/lidokain')).toEqual([
      'metronidazol', 'mikonazol nitrat', 'lidokain',
    ]);
    expect(splitComponents('izokonazol nitrat + diflukortolon valerat')).toEqual([
      'izokonazol nitrat', 'diflukortolon valerat',
    ]);
    expect(splitComponents('amoksisilin ve klavulanik asit')).toEqual([
      'amoksisilin', 'klavulanik asit',
    ]);
  });

  it('kelime içindeki "ve" hecesinden bölmez', () => {
    expect(splitComponents('levotiroksin')).toEqual(['levotiroksin']);
    expect(splitComponents('diflukortolon valerat')).toEqual(['diflukortolon valerat']);
  });
});

describe('stripSalt', () => {
  it('sondaki tuz/ester ekini atar', () => {
    expect(stripSalt('mikonazol nitrat')).toBe('mikonazol');
    expect(stripSalt('izokonazol nitrat')).toBe('izokonazol');
    expect(stripSalt('amlodipin besilat')).toBe('amlodipin');
    expect(stripSalt('sildenafil sitrat')).toBe('sildenafil');
    expect(stripSalt('diflukortolon valerat')).toBe('diflukortolon');
    expect(stripSalt('sertralin hidroklorür')).toBe('sertralin');
    expect(stripSalt('atorvastatin kalsiyum')).toBe('atorvastatin');
  });

  it('birden fazla tuz tokenını zincirleme atar', () => {
    expect(stripSalt('prednizolon sodyum fosfat')).toBe('prednizolon');
    expect(stripSalt('deksametazon sodyum fosfat')).toBe('deksametazon');
  });

  it('molekülün parçası olan nitrat türevlerine dokunmaz', () => {
    expect(stripSalt('izosorbid dinitrat')).toBe('izosorbid dinitrat');
    expect(stripSalt('izosorbid mononitrat')).toBe('izosorbid mononitrat');
    expect(stripSalt('gliseril trinitrat')).toBe('gliseril trinitrat');
  });

  it('katyonla başlayan inorganik tuz adlarını bütün bırakır', () => {
    expect(stripSalt('kalsiyum karbonat')).toBe('kalsiyum karbonat');
    expect(stripSalt('lityum karbonat')).toBe('lityum karbonat');
    expect(stripSalt('sodyum klorür')).toBe('sodyum klorür');
    expect(stripSalt('potasyum sitrat')).toBe('potasyum sitrat');
  });

  it('tek tokenlı adları değiştirmez', () => {
    expect(stripSalt('warfarin')).toBe('warfarin');
    expect(stripSalt('nitrat')).toBe('nitrat');
  });
});

describe('getComponents + sinonimler', () => {
  const synonyms = buildSynonymLookup({
    'asetilsalisilik asit': ['aspirin', 'asa'],
    'lityum': ['lityum karbonat', 'lityum sitrat'],
    'gliseril trinitrat': ['nitrogliserin'],
  });

  it('çoklu etken maddeyi kanonik bileşen kümesine çevirir', () => {
    expect(getComponents('Parasetamol, Aspirin, Kafein', synonyms)).toEqual([
      'parasetamol', 'asetilsalisilik asit', 'kafein',
    ]);
  });

  it('tuz formunu kanonik ada indirger', () => {
    expect(getComponents('Sildenafil Sitrat', synonyms)).toEqual(['sildenafil']);
    expect(getComponents('İzokonazol Nitrat + Diflukortolon Valerat', synonyms)).toEqual([
      'izokonazol', 'diflukortolon',
    ]);
  });

  it('sinonim tablosuyla inorganik tuz kimliğini eşler', () => {
    expect(getComponents('Lityum Karbonat', synonyms)).toEqual(['lityum']);
    expect(getComponents('Nitrogliserin', synonyms)).toEqual(['gliseril trinitrat']);
  });

  it('geçersiz girdide boş küme döner', () => {
    expect(getComponents('Etken maddesi bilgisi bulunamadı.', synonyms)).toEqual([]);
    expect(getComponents(null, synonyms)).toEqual([]);
  });
});

describe('bitkisel varyant kanonikleşmesi (gerçek sinonim tablosu)', () => {
  // Dataset'te ginkgo 9 farklı yazımla geçiyor; hepsi tek kanona inmezse
  // ad-tabanlı kurallar ürünlerin yalnız bir kısmını yakalar (Tebokan bug'ı).
  let synonyms;
  beforeAll(async () => {
    const real = (await import('../../../../data/ingredient-synonyms.json')).default;
    synonyms = buildSynonymLookup(real);
  });

  it.each([
    'gingko biloba',
    'ginkgo glikozidi',
    'ginkgo biloba kuru ekstresi',
    'ginkgo biloba yapraklari kuru ekstresi',
    'ginkgo biloba yaprakları kuru ekstresi',
    'ginkgo biloba l. yapraklari kuru ekstresi',
  ])('%s → ginkgo biloba', (variant) => {
    expect(getComponents(variant, synonyms)).toEqual(['ginkgo biloba']);
  });

  it('kombinasyon stringinde bitkisel bileşen ayrışır', () => {
    expect(getComponents('memantin hcl ve ginko biloba kuru ekstresi', synonyms))
      .toEqual(['memantin', 'ginkgo biloba']);
  });

  it('tentür yazımları kanonikleşir (NOROBALANS)', () => {
    expect(getComponents('tent. de valeriane, tent. de pasiflora, tent. de grateagus', synonyms))
      .toEqual(['valerian', 'pasiflora', 'crataegus']);
  });

  it('senna türevleri tek kanona iner', () => {
    expect(getComponents('sennosid a+b kalsiyum', synonyms)).toEqual(['senna']);
    expect(getComponents('senna glycosides', synonyms)).toEqual(['senna']);
  });
});
