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

export function usePresensiSessionDetail(sessionId?: string): PresensiSessionDetailState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<PresensiSessionDetailState, 'retry'>>({
    status: sessionId ? 'loading' : 'not-found',
    session: null,
    lab: null,
    meta: null,
    errorMessage: sessionId ? null : 'ID sesi tidak ditemukan.',
  });

  useEffect(() => {
    if (!sessionId) {
      setState({ status: 'not-found', session: null, lab: null, meta: null, errorMessage: 'ID sesi tidak ditemukan.' });
      return;
    }
    if (!firebase) {
      setState({ status: 'error', session: null, lab: null, meta: null, errorMessage: 'Layanan Firebase belum siap.' });
      return;
    }

    const { db } = firebase;
    let active = true;
    setState((prev) => ({ ...prev, status: 'loading', errorMessage: null }));

    void (async () => {
      try {
        const snap = await getDoc(doc(db, 'sessions', sessionId));
        if (!active) return;
        if (!snap.exists()) {
          setState({ status: 'not-found', session: null, lab: null, meta: null, errorMessage: 'Sesi praktikum tidak ditemukan.' });
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
        setState({
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
          setState({
            status: 'forbidden',
            session: null,
            lab: null,
            meta: null,
            errorMessage: 'Anda tidak terdaftar sebagai peserta pada sesi praktikum ini.',
          });
          return;
        }
        setState({
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

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
