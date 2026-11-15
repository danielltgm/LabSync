import { useState } from 'react';

import { enrollStudent, unenrollStudent } from '@/services/enrollmentService';

export function useEnrollments(classId?: string) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();

  async function handleEnroll(studentUid: string) {
    if (!classId) return { success: false, error: 'ID kelas tidak valid.' };
    setBusy(true);
    setActionError(undefined);
    try {
      const result = await enrollStudent(classId, studentUid);
      if (!result.success) setActionError(result.error);
      return result;
    } finally {
      setBusy(false);
    }
  }

  async function handleUnenroll(studentUid: string) {
    if (!classId) return { success: false, error: 'ID kelas tidak valid.' };
    setBusy(true);
    setActionError(undefined);
    try {
      const result = await unenrollStudent(classId, studentUid);
      if (!result.success) setActionError(result.error);
      return result;
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    error: actionError,
    enroll: handleEnroll,
    unenroll: handleUnenroll,
  };
}
