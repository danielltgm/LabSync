import { Timestamp } from 'firebase/firestore';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Mengonversi tanggal (YYYY-MM-DD) dan waktu (HH:mm) dalam zona Asia/Jakarta (UTC+7)
 * ke epoch milliseconds UTC.
 */
export function jakartaDateTimeToMillis(dateStr: string, timeStr: string): number {
  const cleanDate = dateStr.trim();
  const cleanTime = timeStr.trim();

  if (!DATE_REGEX.test(cleanDate)) {
    throw new Error(`Format tanggal tidak valid: "${dateStr}". Gunakan YYYY-MM-DD.`);
  }
  if (!TIME_REGEX.test(cleanTime)) {
    throw new Error(`Format waktu tidak valid: "${timeStr}". Gunakan HH:mm.`);
  }

  const [yearStr, monthStr, dayStr] = cleanDate.split('-');
  const [hourStr, minuteStr] = cleanTime.split(':');

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  // Verifikasi keabsahan kalender
  const testDate = new Date(Date.UTC(year, month - 1, day));
  if (
    testDate.getUTCFullYear() !== year ||
    testDate.getUTCMonth() !== month - 1 ||
    testDate.getUTCDate() !== day
  ) {
    throw new Error(`Tanggal kalender tidak valid: "${dateStr}".`);
  }

  // Asia/Jakarta adalah UTC+7 (konstan, tidak ada Daylight Saving Time)
  // Waktu UTC = Waktu Jakarta - 7 jam
  const utcMillis = Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0);
  return utcMillis;
}

export function jakartaDateTimeToTimestamp(dateStr: string, timeStr: string): Timestamp {
  const millis = jakartaDateTimeToMillis(dateStr, timeStr);
  return Timestamp.fromMillis(millis);
}

export interface SessionTimestamps {
  startsAtMillis: number;
  endsAtMillis: number;
  startsAt: Timestamp;
  endsAt: Timestamp;
}

export function calculateSessionTimestamps(
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string
): SessionTimestamps {
  const startsAtMillis = jakartaDateTimeToMillis(dateStr, startTimeStr);
  const endsAtMillis = jakartaDateTimeToMillis(dateStr, endTimeStr);

  if (startsAtMillis >= endsAtMillis) {
    throw new Error('Jam selesai sesi praktikum harus setelah jam mulai.');
  }

  return {
    startsAtMillis,
    endsAtMillis,
    startsAt: Timestamp.fromMillis(startsAtMillis),
    endsAt: Timestamp.fromMillis(endsAtMillis),
  };
}
