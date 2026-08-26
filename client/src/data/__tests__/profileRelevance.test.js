import { describe, it, expect } from 'vitest';
import { relevantWarningTypes, isProfileSet, isGeriatric, profileSummary } from '../profileRelevance.js';

const empty = { sex: null, ageBand: null, pregnant: false, breastfeeding: false };

describe('profileRelevance', () => {
  it('gebe → pregnancy; emziren → lactation', () => {
    const t = relevantWarningTypes({ ...empty, sex: 'k', pregnant: true, breastfeeding: true });
    expect(t.has('pregnancy')).toBe(true);
    expect(t.has('lactation')).toBe(true);
  });

  it('pediatrik yaş bandı → age; yetişkin/yaşlı → age YOK', () => {
    expect(relevantWarningTypes({ ...empty, ageBand: 'cocuk' }).has('age')).toBe(true);
    expect(relevantWarningTypes({ ...empty, ageBand: 'bebek' }).has('age')).toBe(true);
    expect(relevantWarningTypes({ ...empty, ageBand: 'yetiskin' }).has('age')).toBe(false);
    expect(relevantWarningTypes({ ...empty, ageBand: 'yasli' }).has('age')).toBe(false);
  });

  it('boş profil → hiçbir ilgili tip', () => {
    expect(relevantWarningTypes(empty).size).toBe(0);
    expect(isProfileSet(empty)).toBe(false);
  });

  it('isGeriatric yalnız yaşlı bandında', () => {
    expect(isGeriatric({ ...empty, ageBand: 'yasli' })).toBe(true);
    expect(isGeriatric({ ...empty, ageBand: 'cocuk' })).toBe(false);
  });

  it('profileSummary okunur metin üretir', () => {
    const s = profileSummary({ sex: 'k', ageBand: 'yasli', pregnant: false, breastfeeding: true });
    expect(s).toContain('Kadın');
    expect(s).toContain('Yaşlı');
    expect(s).toContain('Emziren');
  });
});
