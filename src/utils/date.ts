/**
 * 日時を「11/08 09:05」（月/日 時:分）の形の文字列にする。画面の「入室した時間」の表示に使う。
 * 日時がない・日時として読めないときは「-」を返す。
 *
 *   formatDateTime('2026-11-08T00:05:00Z') // → '11/08 09:05'（日本時間で表示したとき）
 */
export function formatDateTime(dt: string | Date | null | undefined): string {
  if (!dt) return '-';
  const date = typeof dt === 'string' ? new Date(dt) : dt;
  if (isNaN(date.getTime())) return '-';
  // 1 桁の数字の前に 0 を付ける（9 → '09'）
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
