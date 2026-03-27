function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDateTime(value);
  if (!date) return '—';

  // 使用 UTC 方法避免设备本地时区偏移：数据库存的是 UTC，
  // 用户选的 09:00 存为 UTC 09:00，应原样展示
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());

  return `${year}-${month}-${day} ${hour}:${minute}`;
}
