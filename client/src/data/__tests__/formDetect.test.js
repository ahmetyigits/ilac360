import { describe, it, expect } from 'vitest';
import { detectForm, isLowSystemicForm } from '../formDetect.js';

// detectForm searchFold'lanmış ad bekler (küçük harf, ı→i katlanmış).
describe('detectForm', () => {
  it('jel/krem adı + topikal ATC → topikal', () => {
    expect(detectForm('dolorex %1 jel (50 g)', 'M02AA15')).toBe('topikal');
    expect(detectForm('travazol krem', 'D01AC44')).toBe('topikal');
  });

  it('tablet/kapsül → sistemik', () => {
    expect(detectForm('parol 500 mg tablet', 'N02BE01')).toBe('sistemik');
    expect(detectForm('contramal 50 mg kapsul', 'N02AX02')).toBe('sistemik');
  });

  it('transdermal bant TOPİKAL DEĞİL transdermal (sistemik etkili) sayılır', () => {
    expect(detectForm('nitroderm tts 5 transdermal flaster', 'C01DA02')).toBe('transdermal');
    expect(isLowSystemicForm('transdermal')).toBe(false);
  });

  it('göz damlası ATC (S01) → oftalmik; ATC ad tokenından güçlüdür', () => {
    expect(detectForm('tobrased goz damlasi', 'S01AA12')).toBe('oftalmik');
  });

  it("'damla' tek başına form saymaz (oral pediatrik damlalar sistemiktir)", () => {
    expect(detectForm('bebiron damla 10 ml', null)).toBeNull();
  });

  it('inhalasyon → inhale ve bastırılmaz (sistemik sayılır)', () => {
    expect(detectForm('ventolin inhalasyon aerosolu', 'R03AC02')).toBe('inhale');
    expect(isLowSystemicForm('inhale')).toBe(false);
  });

  it('izotretinoin gibi oral D-grubu ilaçlar topikal SANILMAZ', () => {
    // TOPICAL_ATC_PREFIXES bilinçli olarak D'nin tamamını kapsamaz.
    expect(detectForm('roaccutane 10 mg kapsul', 'D10BA01')).toBe('sistemik');
  });

  it("'JELATİN kapsül' jel SANILMAZ (regresyon: ' jel ' kelime sınırlı)", () => {
    expect(detectForm('roaccutane roche 20 mg yumuşak jelatin kapsül, 100 adet', 'D10BA01')).toBe('sistemik');
    expect(detectForm('zoretanin 20 mg yumuşak jelatin kapsül, 90 adet', 'D10BA01')).toBe('sistemik');
  });

  it('bitişik yazılan emulsiyojel topikal kalır', () => {
    expect(detectForm('triakne %10 emulsiyojel 50 g', 'D10AE01')).toBe('topikal');
  });

  it('ORAL JEL sistemik sayılır (saşe içi jel, ör. sildenafil oral jel)', () => {
    expect(detectForm('jeligra 50 mg oral jel içeren saşe, 4 adet', null)).toBe('sistemik');
  });

  it('belirlenemeyen form null döner (çağıran sistemik varsayar — güvenli taraf)', () => {
    expect(detectForm('acayip urun x', null)).toBeNull();
    expect(isLowSystemicForm(null)).toBe(false);
  });

  it('topikal ve oftalmik düşük-sistemik sayılır', () => {
    expect(isLowSystemicForm('topikal')).toBe(true);
    expect(isLowSystemicForm('oftalmik')).toBe(true);
  });
});
