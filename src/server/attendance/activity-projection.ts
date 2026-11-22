import type { ExtendedSessionDocument } from '@/firebase/mutations';
import { isValidLabId } from '@/server/labs/lab-service';
import type { LabActivityDocument } from '@/types/sprint3';

import { calculateSessionTimestamps } from './schedule-utils';

/**
 * Membangun dokumen proyeksi aktivitas laboratorium (D-07).
 * Hanya mempublikasikan metadata sesi publik:
 * `sessionId`, `labId`, `courseName`, `className`, `startsAt`, `endsAt`, `status`, dan `scheduleRevision`.
 *
 * Secara tegas MENGECUALIKAN seluruh data privat/sensitif:
 * - Tidak memuat UID peserta (studentUid), asisten (assistantUid), atau classId.
 * - Tidak memuat daftar peserta, presensi, catatan, atau alasan izin.
 * - Tidak memuat snapshot koordinat mentah / token QR / challengeId.
 */
export function buildLabActivityProjection(
  sessionId: string,
  session: Partial<ExtendedSessionDocument>
): LabActivityDocument | null {
  const cleanSessionId = sessionId?.trim();
  if (!cleanSessionId) {
    return null;
  }

  // Sesi wajib memiliki labId resmi
  if (!session.labId || !isValidLabId(session.labId)) {
    return null;
  }

  const courseName = session.courseName?.trim();
  const className = session.className?.trim();
  if (!courseName || !className) {
    return null;
  }

  const validStatuses: ('TERJADWAL' | 'DIBUKA' | 'SELESAI')[] = ['TERJADWAL', 'DIBUKA', 'SELESAI'];
  const status = session.status && validStatuses.includes(session.status as any)
    ? (session.status as 'TERJADWAL' | 'DIBUKA' | 'SELESAI')
    : 'TERJADWAL';

  // Resolusi rentang waktu (startsAt dan endsAt)
  let startsAt = session.startsAt;
  let endsAt = session.endsAt;

  if (!startsAt || !endsAt) {
    if (session.date && session.startTime && session.endTime) {
      try {
        const calculated = calculateSessionTimestamps(
          session.date,
          session.startTime,
          session.endTime
        );
        startsAt = calculated.startsAt;
        endsAt = calculated.endsAt;
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  const scheduleRevision =
    typeof session.scheduleRevision === 'number' && session.scheduleRevision >= 1
      ? session.scheduleRevision
      : 1;

  // Objek proyeksi bersih hanya memuat field kontrak D-07
  return {
    sessionId: cleanSessionId,
    labId: session.labId,
    courseName,
    className,
    startsAt,
    endsAt,
    status,
    scheduleRevision,
  };
}

export interface SyncProjectionResult {
  synced: boolean;
  activity: LabActivityDocument | null;
  reason?: 'SESSION_NOT_CONFIGURED' | 'OUTDATED_REVISION' | 'DATABASE_ERROR';
  error?: string;
}

/**
 * Menyinkronkan dokumen proyeksi aktivitas laboratorium ke Firestore (D-07).
 * Mendukung Firestore Admin SDK maupun Firestore Client SDK.
 * Menangani event tidak berurutan dengan memastikan dokumen tidak ditimpa
 * oleh scheduleRevision yang lebih lama.
 */
export async function syncLabActivity(
  db: any,
  sessionId: string,
  session: Partial<ExtendedSessionDocument>
): Promise<SyncProjectionResult> {
  const activity = buildLabActivityProjection(sessionId, session);
  if (!activity) {
    return {
      synced: false,
      activity: null,
      reason: 'SESSION_NOT_CONFIGURED',
    };
  }

  try {
    // 1. Baca dokumen proyeksi yang ada (jika ada) untuk memeriksa scheduleRevision
    let existingData: Record<string, unknown> | null = null;

    if (typeof db.doc === 'function') {
      // Firebase Admin Firestore SDK
      const snap = await db.doc(`labActivities/${sessionId}`).get();
      if (snap.exists) {
        existingData = snap.data() as Record<string, unknown>;
      }
    } else if (typeof db.collection === 'function' || db.type === 'firestore') {
      // Firebase Client Firestore SDK atau emulator mock
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'labActivities', sessionId));
        if (snap.exists()) {
          existingData = snap.data() as Record<string, unknown>;
        }
      } catch {
        // Fallback jika pemanggilan langsung
      }
    }

    // 2. Proteksi Event Tidak Berurutan (Out-of-order handling)
    if (existingData && typeof existingData.scheduleRevision === 'number') {
      if (existingData.scheduleRevision > activity.scheduleRevision) {
        return {
          synced: false,
          activity: null,
          reason: 'OUTDATED_REVISION',
        };
      }
    }

    // 3. Tulis/perbarui dokumen proyeksi
    if (typeof db.doc === 'function') {
      await db.doc(`labActivities/${sessionId}`).set(activity, { merge: true });
    } else {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'labActivities', sessionId), activity, { merge: true });
    }

    return {
      synced: true,
      activity,
    };
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message ?? 'Gagal menyinkronkan proyeksi aktivitas laboratorium.';
    return {
      synced: false,
      activity: null,
      reason: 'DATABASE_ERROR',
      error: errorMsg,
    };
  }
}

/**
 * Menghapus dokumen proyeksi aktivitas laboratorium saat sesi dihapus (D-07).
 */
export async function deleteLabActivity(
  db: any,
  sessionId: string
): Promise<boolean> {
  const cleanSessionId = sessionId?.trim();
  if (!cleanSessionId) return false;

  try {
    if (typeof db.doc === 'function') {
      await db.doc(`labActivities/${cleanSessionId}`).delete();
    } else {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'labActivities', cleanSessionId));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper untuk mengekstrak epoch milliseconds dari Timestamp Firestore
 * (mendukung method toMillis(), toDate(), field seconds/nanoseconds, atau number).
 */
export function extractTimestampMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts.seconds === 'number') {
    return ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1e6);
  }
  if (typeof ts === 'number') return ts;
  return 0;
}

export interface ResolvedLabActivities {
  currentActivities: LabActivityDocument[];
  nextActivities: LabActivityDocument[];
}

/**
 * Menyelesaikan aktivitas "Sekarang" (current) dan "Berikutnya" (next)
 * berdasarkan spesifikasi SRS Y-04:
 *
 * 1. Aktivitas Sekarang:
 *    - `startsAt <= now < endsAt` dan status belum `SELESAI`.
 *    - Bila ada beberapa aktivitas bertumpuk, urutkan berdasarkan `startsAt` menaik, lalu `sessionId`.
 *
 * 2. Aktivitas Berikutnya:
 *    - `startsAt > now` dan status belum `SELESAI`.
 *    - Diurutkan berdasarkan `startsAt` menaik (waktu mulai terdekat), lalu `sessionId`.
 */
export function resolveCurrentAndNextActivities(
  activities: LabActivityDocument[],
  nowTimestampMs?: number
): ResolvedLabActivities {
  const now = typeof nowTimestampMs === 'number' ? nowTimestampMs : Date.now();

  const currentList: { activity: LabActivityDocument; startMs: number; endMs: number }[] = [];
  const nextList: { activity: LabActivityDocument; startMs: number; endMs: number }[] = [];

  for (const act of activities) {
    if (!act || act.status === 'SELESAI') {
      continue;
    }

    const startMs = extractTimestampMillis(act.startsAt);
    const endMs = extractTimestampMillis(act.endsAt);

    if (startMs <= 0 || endMs <= 0 || startMs >= endMs) {
      continue;
    }

    if (startMs <= now && now < endMs) {
      currentList.push({ activity: act, startMs, endMs });
    } else if (startMs > now) {
      nextList.push({ activity: act, startMs, endMs });
    }
  }

  const comparator = (
    a: { activity: LabActivityDocument; startMs: number },
    b: { activity: LabActivityDocument; startMs: number }
  ) => {
    if (a.startMs !== b.startMs) {
      return a.startMs - b.startMs;
    }
    return a.activity.sessionId.localeCompare(b.activity.sessionId);
  };

  currentList.sort(comparator);
  nextList.sort(comparator);

  return {
    currentActivities: currentList.map((item) => item.activity),
    nextActivities: nextList.map((item) => item.activity),
  };
}
