
export function formatSyncTimeUTC8(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 8 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()} ${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
