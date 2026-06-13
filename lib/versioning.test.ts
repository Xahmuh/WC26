import { compareVersions, isVersionOlderThan } from '@/lib/versioning';

describe('versioning', () => {
  it('compares semantic version parts numerically', () => {
    expect(compareVersions('1.0.10', '1.0.2')).toBe(1);
    expect(compareVersions('1.2.0', '1.10.0')).toBe(-1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
  });

  it('detects app versions below the configured minimum', () => {
    expect(isVersionOlderThan('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionOlderThan('1.0.1', '1.0.1')).toBe(false);
  });
});
