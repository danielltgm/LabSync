import type { Timestamp } from 'firebase/firestore';

/** Planned Sprint 3 contracts; these types do not enable a client write path. */
export type LabId = 'lab-ap' | 'lab-b' | 'lab-c' | 'lab-d';
export type DemoPlatform = 'android' | 'ios';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LabConfiguration {
  id: LabId;
  name: string;
  coordinates: Coordinates | null;
  enabled: boolean;
  configVersion: number;
}

export interface Sprint3PolicyDraft {
  policyVersion: string;
  timezone: 'Asia/Jakarta';
  demoPlatforms: DemoPlatform[];
  qrTtlSeconds: number | null;
  maxLocationAgeMs: number | null;
  maxAccuracyMeters: number | null;
  maxFutureSkewMs: number | null;
}

export interface AttendanceConfigSnapshot {
  labId: LabId;
  coordinates: Coordinates;
  labConfigVersion: number;
  radiusMeters: number;
  policyVersion: string;
}

/** Additional fields must be populated by a validated migration/server path. */
export interface Sprint3SessionFields {
  labId: LabId;
  radiusMeters: number;
  scheduleRevision: number;
  startsAt: Timestamp;
  endsAt: Timestamp;
  attendanceConfig?: AttendanceConfigSnapshot;
}

export interface AttendanceQrPayload {
  version: 1;
  sessionId: string;
  challengeId: string;
  token: string;
}

export interface DeviceLocationFix extends Coordinates {
  accuracyMeters: number;
  capturedAtMs: number;
}

export interface CheckInRequest {
  sessionId: string;
  challengeId: string;
  token: string;
  location: DeviceLocationFix;
  notes?: string;
}

export interface CheckInResult {
  status: 'recorded' | 'already-recorded';
  attendanceId: string;
  checkedInAt: string;
  distanceMeters: number;
  radiusMeters: number;
}

export type CheckInErrorCode =
  | 'AUTH_REQUIRED' | 'FORBIDDEN' | 'SESSION_NOT_FOUND' | 'SESSION_CLOSED'
  | 'LAB_NOT_CONFIGURED' | 'POLICY_NOT_CONFIGURED' | 'QR_INVALID' | 'QR_EXPIRED'
  | 'LOCATION_INVALID' | 'LOCATION_STALE' | 'LOCATION_INACCURATE' | 'OUTSIDE_RADIUS'
  | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE';

export interface AttendanceVerification {
  method: 'qr-geotag';
  labId: LabId;
  labConfigVersion: number;
  policyVersion: string;
  challengeId: string;
  distanceMeters: number;
  radiusMeters: number;
  location: DeviceLocationFix;
  locationAgeMs: number;
}

export type NotificationEventType =
  | 'session.opened' | 'schedule.changed' | 'leave.approved' | 'leave.rejected';

export interface NotificationNavigationData {
  eventId: string;
  type: NotificationEventType;
  sessionId: string;
  leaveRequestId?: string;
}

export interface LabActivityDocument {
  sessionId: string;
  labId: LabId;
  courseName: string;
  className: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
  status: 'TERJADWAL' | 'DIBUKA' | 'SELESAI';
  scheduleRevision: number;
}
