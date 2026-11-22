import type {
  AttendanceQrPayload,
  CheckInRequest,
  DeviceLocationFix,
} from '../../types/sprint3';

export interface BuildCheckInInput {
  sessionId: string;
  qr: AttendanceQrPayload;
  location: DeviceLocationFix;
  notes?: string;
}

export function buildCheckInRequest(input: BuildCheckInInput): CheckInRequest {
  const cleanNotes = input.notes?.trim();
  return {
    sessionId: input.sessionId,
    challengeId: input.qr.challengeId,
    token: input.qr.token,
    location: {
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      accuracyMeters: input.location.accuracyMeters,
      capturedAtMs: input.location.capturedAtMs,
    },
    ...(cleanNotes ? { notes: cleanNotes.slice(0, 250) } : {}),
  };
}

export function resolveCheckInUrl(apiOrigin?: string | null): string | null {
  const trimmed = apiOrigin?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return `${parsed.origin}/api/attendance/check-in`;
  } catch {
    return null;
  }
}
