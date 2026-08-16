/**
 * meta.updatedAt 为 UTC，固定转北京时间（UTC+8）展示，避免构建机时区差异。
 * 输出格式：2026-8-12 14:30:22
 */
export function formatSyncTimeUTC8(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 8 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()} ${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
