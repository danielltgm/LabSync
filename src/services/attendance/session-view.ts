import type { LiveSession } from '../../types/sprint2';
import type {
  AttendanceConfigSnapshot,
  LabConfiguration,
  LabId,
  Sprint3SessionFields,
} from '../../types/sprint3';

const LAB_LABELS: Record<LabId, string> = {
  'lab-ap': 'LAB AP',
  'lab-b': 'LAB B',
  'lab-c': 'LAB C',
  'lab-d': 'LAB D',
};

export type PresensiSessionDocument = LiveSession & Partial<Sprint3SessionFields>;

export interface PresensiSessionMeta {
  sessionId: string;
  courseName: string;
  className: string;
  scheduleLabel: string;
  labName: string;
  labId: LabId | null;
  radiusMeters: number | null;
  attendanceConfig: AttendanceConfigSnapshot | null;
  isGeotagReady: boolean;
  geotagStatusLabel: string;
}

export function buildPresensiSessionMeta(
  session: PresensiSessionDocument,
  lab?: LabConfiguration | null,
): PresensiSessionMeta {
  const snapshot = session.attendanceConfig ?? null;
  const labId = snapshot?.labId ?? session.labId ?? null;
  const labName =
    lab?.name ??
    (labId && Object.hasOwn(LAB_LABELS, labId) ? LAB_LABELS[labId] : null) ??
    session.labRoom;
  const radiusMeters =
    typeof snapshot?.radiusMeters === 'number' && Number.isFinite(snapshot.radiusMeters) && snapshot.radiusMeters > 0
      ? snapshot.radiusMeters
      : typeof session.radiusMeters === 'number' && Number.isFinite(session.radiusMeters) && session.radiusMeters > 0
        ? session.radiusMeters
        : null;

  const hasSnapshotCoords =
    snapshot !== null &&
    Number.isFinite(snapshot.coordinates.latitude) &&
    Number.isFinite(snapshot.coordinates.longitude);
  const hasLabCoords =
    lab != null &&
    lab.enabled &&
    lab.coordinates !== null &&
    Number.isFinite(lab.coordinates.latitude) &&
    Number.isFinite(lab.coordinates.longitude);

  const isGeotagReady = radiusMeters !== null && (hasSnapshotCoords || hasLabCoords);
  const geotagStatusLabel = isGeotagReady
    ? `${labName} • Radius ${radiusMeters} m`
    : 'Lokasi lab atau radius belum dikonfigurasi';

  return {
    sessionId: session.id,
    courseName: session.courseName,
    className: session.className,
    scheduleLabel: `${session.date} • ${session.startTime}–${session.endTime} WIB`,
    labName,
    labId,
    radiusMeters,
    attendanceConfig: snapshot,
    isGeotagReady,
    geotagStatusLabel,
  };
}
