import { useCallback, useRef, useState } from 'react';

import {
  parseAttendanceQrPayload,
  type QrValidationErrorCode,
} from '@/services/attendance/qr-validator';
import type { AttendanceQrPayload } from '@/types/sprint3';

export interface QrScannerController {
  payload: AttendanceQrPayload | null;
  errorCode: QrValidationErrorCode | null;
  errorMessage: string | null;
  locked: boolean;
  handleScanData: (raw: string) => boolean;
  resetQr: () => void;
  markQrExpired: (message?: string) => void;
}

export function useQrScanner(expectedSessionId: string, busy = false): QrScannerController {
  const [payload, setPayload] = useState<AttendanceQrPayload | null>(null);
  const [errorCode, setErrorCode] = useState<QrValidationErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lockRef = useRef(false);

  const handleScanData = useCallback(
    (raw: string): boolean => {
      if (busy || lockRef.current) return false;
      lockRef.current = true;

      const result = parseAttendanceQrPayload(raw, expectedSessionId);
      if (!result.ok) {
        setPayload(null);
        setErrorCode(result.code);
        setErrorMessage(result.message);
        return false;
      }

      setPayload(result.payload);
      setErrorCode(null);
      setErrorMessage(null);
      return true;
    },
    [busy, expectedSessionId],
  );

  const resetQr = useCallback(() => {
    lockRef.current = false;
    setPayload(null);
    setErrorCode(null);
    setErrorMessage(null);
  }, []);

  const markQrExpired = useCallback((message?: string) => {
    lockRef.current = false;
    setPayload(null);
    setErrorCode('QR_EXPIRED');
    setErrorMessage(message ?? 'QR presensi sudah kedaluwarsa. Pindai QR terbaru dari layar asisten.');
  }, []);

  return {
    payload,
    errorCode,
    errorMessage,
    locked: busy || payload !== null || errorCode !== null,
    handleScanData,
    resetQr,
    markQrExpired,
  };
}
