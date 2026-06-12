import { getFlagUrl, resolveFlagCode } from '@/constants/countryCodes';

describe('country flag resolution', () => {
  it('resolves World Cup team aliases that are not ISO alpha-3 codes', () => {
    expect(resolveFlagCode('COD')).toBe('cd');
    expect(resolveFlagCode('Congo DR')).toBe('cd');
    expect(resolveFlagCode('CUW')).toBe('cw');
    expect(resolveFlagCode('Curaçao')).toBe('cw');
    expect(resolveFlagCode('HAI')).toBe('ht');
    expect(resolveFlagCode('SWE')).toBe('se');
  });

  it('uses higher-resolution flag images', () => {
    expect(getFlagUrl('SWE')).toBe('https://flagcdn.com/w160/se.png');
  });
});
