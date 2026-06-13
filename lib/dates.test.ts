import { toIsoTimestamp, toTimestamp } from '@/lib/dates';

describe('date helpers', () => {
  it('normalizes Postgres timestamptz strings to ISO timestamps', () => {
    expect(toIsoTimestamp('2026-06-13 19:00:00+00')).toBe('2026-06-13T19:00:00+00:00');
    expect(toIsoTimestamp('2026-06-13 19:00:00+0000')).toBe('2026-06-13T19:00:00+00:00');
  });

  it('parses normalized Postgres timestamps as UTC', () => {
    expect(toTimestamp('2026-06-13 19:00:00+00')).toBe(
      new Date('2026-06-13T19:00:00+00:00').getTime()
    );
  });
});
