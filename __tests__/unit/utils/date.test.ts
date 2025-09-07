import { formatDateTime } from '@/utils/date';

describe('formatDateTime', () => {
  it('null/undefinedはハイフン', () => {
    expect(formatDateTime(null)).toBe('-');
    expect(formatDateTime(undefined)).toBe('-');
  });

  it('不正な日付文字列はハイフン', () => {
    expect(formatDateTime('not-a-date')).toBe('-');
  });

  it('空文字や空白だけの文字列はハイフン', () => {
    expect(formatDateTime('')).toBe('-');
    expect(formatDateTime('   ')).toBe('-');
  });

  it('不正フォーマットはハイフン（確実にInvalidになる例）', () => {
    expect(formatDateTime('2024-02-30abc')).toBe('-');
    expect(formatDateTime('99/99/9999')).toBe('-');
    expect(formatDateTime('2024/01/02 03:04:00???')).toBe('-');
  });

  it('無効なDateオブジェクトはハイフン', () => {
    const invalid = new Date('invalid');
    expect(formatDateTime(invalid as unknown as Date)).toBe('-');
  });

  it('非対応型（numberなど）はハイフン', () => {
    expect(formatDateTime(0 as unknown as any)).toBe('-');
  });

  it('DateオブジェクトをMM/DD HH:mmで返す', () => {
    const d = new Date('2024-01-02T03:04:00Z');
    const out = formatDateTime(d);
    expect(out).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it('文字列日付も受け付ける', () => {
    const out = formatDateTime('2024-05-06T07:08:00Z');
    expect(out).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
  });
});
