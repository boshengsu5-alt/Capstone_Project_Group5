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

// 使用 UTC 方法避免浏览器本地时区偏移：数据库存的是 UTC，
// 用户选的 09:00 存为 UTC 09:00，应原样展示而非转成本地时间
function formatDatePart(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function formatTimePart(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function formatDate(value: string | null | undefined): string {
  const date = parseDateTime(value);
  return date ? formatDatePart(date) : '—';
}

export function formatTime(value: string | null | undefined): string {
  const date = parseDateTime(value);
  return date ? formatTimePart(date) : '—';
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDateTime(value);
  return date ? `${formatDatePart(date)} ${formatTimePart(date)}` : '—';
}

export function formatDateTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  const startDate = parseDateTime(start);
  const endDate = parseDateTime(end);

  if (!startDate || !endDate) return '—';

  const sameDay =
    startDate.getUTCFullYear() === endDate.getUTCFullYear()
    && startDate.getUTCMonth() === endDate.getUTCMonth()
    && startDate.getUTCDate() === endDate.getUTCDate();

  if (sameDay) {
    return `${formatDatePart(startDate)} ${formatTimePart(startDate)} → ${formatTimePart(endDate)}`;
  }

  return `${formatDatePart(startDate)} ${formatTimePart(startDate)} → ${formatDatePart(endDate)} ${formatTimePart(endDate)}`;
}
