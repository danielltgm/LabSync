import { useCallback, useState } from 'react';

import { firebase } from '@/firebase/client';
import type { DeviceLocationController } from '@/hooks/use-device-location';
import type { QrScannerController } from '@/hooks/use-qr-scanner';
import {
  submitAttendanceCheckIn,
  type CheckInOutcome,
} from '@/services/attendance/check-in-client';
import {
  resolveCheckInFeedback,
  type CheckInFeedbackView,
} from '@/services/attendance/check-in-feedback';
import {
  buildCheckInRequest,
  resolveCheckInUrl,
} from '@/services/attendance/check-in-request';
import { validateDeviceLocationFix } from '@/services/attendance/location-validator';
import { toLiveAttendanceFromCheckIn } from '@/services/attendance/recap-sync';
import type { LiveAttendanceRecord } from '@/types/attendance-view';

export interface CheckInRecordContext {
  studentUid: string;
  studentId: string;
  studentName: string;
  className: string;
}

export interface CheckInController {
  submitting: boolean;
  outcome: CheckInOutcome | null;
  feedback: CheckInFeedbackView | null;
  committedRecord: LiveAttendanceRecord | null;
  submit: (notes: string) => Promise<void>;
  clearFeedback: () => void;
}

export function useCheckInController(
  sessionId: string | undefined,
  qrScanner: QrScannerController,
  deviceLocation: DeviceLocationController,
  recordContext?: CheckInRecordContext,
): CheckInController {
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [feedback, setFeedback] = useState<CheckInFeedbackView | null>(null);
  const [submittedNotes, setSubmittedNotes] = useState('');

  const submit = useCallback(
    async (notes: string) => {
      if (!sessionId || !qrScanner.payload || !deviceLocation.fix || submitting) return;

      const freshness = validateDeviceLocationFix(deviceLocation.fix);
      if (!freshness.ok) {
        setFeedback({
          title: 'Lokasi Perlu Diperbarui',
          message: freshness.message,
          tone: 'warning',
          recoveryAction: 'refresh-location',
          recoveryLabel: 'Ambil Ulang Lokasi',
        });
        return;
      }

      setSubmitting(true);
      setFeedback(null);
      try {
        const request = buildCheckInRequest({
          sessionId,
          qr: qrScanner.payload,
          location: deviceLocation.fix,
          notes,
        });
        const result = await submitAttendanceCheckIn(request, {
          endpointUrl: resolveCheckInUrl(process.env.EXPO_PUBLIC_LABSYNC_API_ORIGIN),
          getIdToken: async () => (await firebase?.auth.currentUser?.getIdToken()) ?? null,
        });
        setSubmittedNotes(notes);
        setOutcome(result);
        const mapped = resolveCheckInFeedback(result);
        setFeedback(mapped);

        if (result.kind === 'server-error' && result.code === 'QR_EXPIRED') {
          qrScanner.markQrExpired(mapped.message);
        } else if (result.kind === 'server-error' && result.code === 'QR_INVALID') {
          qrScanner.resetQr();
        }
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId, qrScanner, deviceLocation, submitting],
  );

  const clearFeedback = useCallback(() => {
    setOutcome(null);
    setFeedback(null);
  }, []);

  const committedRecord =
    outcome?.kind === 'success' && sessionId && recordContext
      ? toLiveAttendanceFromCheckIn({
          result: outcome.data,
          sessionId,
          studentUid: recordContext.studentUid,
          studentId: recordContext.studentId,
          studentName: recordContext.studentName,
          className: recordContext.className,
          notes: submittedNotes,
        })
      : null;

  return { submitting, outcome, feedback, committedRecord, submit, clearFeedback };
}
