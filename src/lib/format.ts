const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const pad = (n: number) => String(n).padStart(2, '0');

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isSameDay(a: number, b: number) {
  return startOfDay(a) === startOfDay(b);
}

export function formatTime(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

export function formatTimeRange(start: number, end: number) {
  return `${formatTime(start)}–${formatTime(end)}`;
}

export function formatClock(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function dayName(ms: number, short = false) {
  return (short ? DAYS_SHORT : DAYS)[new Date(ms).getDay()];
}

export function weekdayName(weekday: number) {
  return DAYS[weekday];
}

export function formatDate(ms: number, opts: { weekday?: boolean; year?: boolean; short?: boolean } = {}) {
  const d = new Date(ms);
  const month = (opts.short ? MONTHS_SHORT : MONTHS)[d.getMonth()];
  const base = `${d.getDate()} ${month}${opts.year ? ` ${d.getFullYear()}` : ''}`;
  return opts.weekday ? `${dayName(ms, opts.short)}, ${base}` : base;
}

export function formatDateTime(ms: number) {
  return `${formatDate(ms, { short: true })} · ${formatTime(ms)}`;
}

export function relativeDay(ms: number, now: number) {
  const diff = Math.round((startOfDay(ms) - startOfDay(now)) / DAY);
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  if (diff === -1) return 'Kemarin';
  if (diff > 1 && diff < 7) return dayName(ms);
  return formatDate(ms, { weekday: true, short: true });
}

/** "12 mnt lagi", "2 jam lalu" */
export function relativeTime(ms: number, now: number) {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const future = diff > 0;
  let label: string;
  if (abs < MINUTE) return future ? 'sebentar lagi' : 'baru saja';
  if (abs < HOUR) label = `${Math.round(abs / MINUTE)} mnt`;
  else if (abs < DAY) label = `${Math.round(abs / HOUR)} jam`;
  else label = `${Math.round(abs / DAY)} hari`;
  return future ? `${label} lagi` : `${label} lalu`;
}

export function countdown(ms: number, now: number) {
  const total = Math.max(0, Math.floor((ms - now) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function toTimeInput(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateInput(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateTimeInput(date: string, time: string) {
  const [y, mo, da] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, (mo ?? 1) - 1, da ?? 1, h ?? 0, mi ?? 0).getTime();
}

export function monthName(ms: number, opts: { short?: boolean; year?: boolean } = {}) {
  const d = new Date(ms);
  return `${(opts.short ? MONTHS_SHORT : MONTHS)[d.getMonth()]}${opts.year ? ` ${d.getFullYear()}` : ''}`;
}

export function startOfMonth(ms: number) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/** Same day-of-month clamp-free month shift (always returns the 1st). */
export function addMonths(ms: number, n: number) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
}

/** Calendar days shown for a month, Monday first, padded to whole weeks. */
export function monthGrid(month: number) {
  const first = new Date(startOfMonth(month));
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - lead);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i).getTime());
}
