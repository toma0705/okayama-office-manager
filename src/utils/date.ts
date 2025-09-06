export function formatDateTime(dt: string | Date | null | undefined): string {
  if (!dt) return '-';
  const date = typeof dt === 'string' ? new Date(dt) : dt;
  if (isNaN(date.getTime())) return '-';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}
