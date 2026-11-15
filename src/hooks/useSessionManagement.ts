import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import { watchSessions } from '@/firebase/queries';
import {
  createSession,
  deleteSession,
  type SessionInput,
} from '@/services/sessionService';
import type { LiveSession } from '@/types/sprint2';

const emptySessions: LiveSession[] = [];

export function useSessionManagement(classId?: string) {
  const [snapshot, setSnapshot] = useState<{ classId: string; sessions: LiveSession[]; error?: string }>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!firebase || !classId) return;

    return watchSessions(
      firebase.db,
      classId,
      (sessions) => setSnapshot({ classId, sessions }),
      (err) =>
        setSnapshot({
          classId,
          sessions: emptySessions,
          error: err.message || 'Gagal memuat sesi kelas.',
        })
    );
  }, [classId]);

  const isCurrent = snapshot && snapshot.classId === classId;
  const sessions = isCurrent ? snapshot.sessions : emptySessions;
  const loading = !snapshot && !!classId;
  const error = isCurrent ? snapshot.error : undefined;

  async function handleCreate(input: SessionInput) {
    setBusy(true);
    try {
      return await createSession(input);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(sessionId: string) {
    setBusy(true);
    try {
      return await deleteSession(sessionId);
    } finally {
      setBusy(false);
    }
  }

  return {
    sessions,
    loading,
    busy,
    error,
    createSession: handleCreate,
    deleteSession: handleDelete,
  };
}
