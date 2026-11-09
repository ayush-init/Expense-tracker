/**
 * Calendar & Date Utilities (Pure TypeScript, zero native runtime dependency)
 */

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function formatYYYYMMDD(year: number, monthZeroIndexed: number, day: number): string {
  const m = String(monthZeroIndexed + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function buildMonthGrid(year: number, monthZeroIndexed: number) {
  const firstDayOfWeek = new Date(year, monthZeroIndexed, 1).getDay();
  const daysInMonth = new Date(year, monthZeroIndexed + 1, 0).getDate();

  const cells: Array<{ key: string; day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ key: `pad-${i}`, day: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatYYYYMMDD(year, monthZeroIndexed, d);
    cells.push({ key: dateStr, day: d, dateStr });
  }
  return cells;
}

export function getTodayYYYYMMDD(): string {
  const now = new Date();
  return formatYYYYMMDD(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getStartOfMonthYYYYMMDD(date = new Date()): string {
  return formatYYYYMMDD(date.getFullYear(), date.getMonth(), 1);
}
