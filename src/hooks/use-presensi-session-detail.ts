import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import {
  buildPresensiSessionMeta,
  type PresensiSessionDocument,
  type PresensiSessionMeta,
} from '@/services/attendance/session-view';
import type { LabConfiguration } from '@/types/sprint3';

export type SessionDetailStatus = 'loading' | 'ready' | 'not-found' | 'forbidden' | 'error';

export interface PresensiSessionDetailState {
  status: SessionDetailStatus;
  session: PresensiSessionDocument | null;
  lab: LabConfiguration | null;
  meta: PresensiSessionMeta | null;
  errorMessage: string | null;
  retry: () => void;
}

interface DetailSnapshot {
  key: string;
  attempt: number;
  status: SessionDetailStatus;
  session: PresensiSessionDocument | null;
  lab: LabConfiguration | null;
  meta: PresensiSessionMeta | null;
  errorMessage: string | null;
}

export function usePresensiSessionDetail(sessionId?: string): PresensiSessionDetailState {
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<DetailSnapshot | null>(null);

  useEffect(() => {
    if (!sessionId || !firebase) return;
    const { db } = firebase;
    let active = true;

    void (async () => {
      try {
        const snap = await getDoc(doc(db, 'sessions', sessionId));
        if (!active) return;
        if (!snap.exists()) {
          setSnapshot({
            key: sessionId,
            attempt,
            status: 'not-found',
            session: null,
            lab: null,
            meta: null,
            errorMessage: 'Sesi praktikum tidak ditemukan.',
          });
          return;
        }
        const session = { ...(snap.data() as Omit<PresensiSessionDocument, 'id'>), id: snap.id };
        const labId = session.attendanceConfig?.labId ?? session.labId;
        let lab: LabConfiguration | null = null;
        if (labId) {
          try {
            const labSnap = await getDoc(doc(db, 'labs', labId));
            if (labSnap.exists()) {
              lab = { ...(labSnap.data() as Omit<LabConfiguration, 'id'>), id: labSnap.id as LabConfiguration['id'] };
            }
          } catch {
            // Keep null lab if master lab doc is unavailable yet.
          }
        }
        if (!active) return;
        setSnapshot({
          key: sessionId,
          attempt,
          status: 'ready',
          session,
          lab,
          meta: buildPresensiSessionMeta(session, lab),
          errorMessage: null,
        });
      } catch (err: unknown) {
        if (!active) return;
        const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
        if (code === 'permission-denied') {
          setSnapshot({
            key: sessionId,
            attempt,
            status: 'forbidden',
            session: null,
            lab: null,
            meta: null,
            errorMessage: 'Anda tidak terdaftar sebagai peserta pada sesi praktikum ini.',
          });
          return;
        }
        setSnapshot({
          key: sessionId,
          attempt,
          status: 'error',
          session: null,
          lab: null,
          meta: null,
          errorMessage: 'Gagal memuat data sesi. Periksa koneksi lalu coba lagi.',
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [sessionId, attempt]);

  const retry = () => setAttempt((n) => n + 1);
  if (!sessionId) {
    return { status: 'not-found', session: null, lab: null, meta: null, errorMessage: 'ID sesi tidak ditemukan.', retry };
  }
  if (!firebase) {
    return { status: 'error', session: null, lab: null, meta: null, errorMessage: 'Layanan Firebase belum siap.', retry };
  }
  if (snapshot && snapshot.key === sessionId && snapshot.attempt === attempt) {
    return {
      status: snapshot.status,
      session: snapshot.session,
      lab: snapshot.lab,
      meta: snapshot.meta,
      errorMessage: snapshot.errorMessage,
      retry,
    };
  }
  return { status: 'loading', session: null, lab: null, meta: null, errorMessage: null, retry };
}
