import { onAuthStateChanged, signOut } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { FoundationGate } from '@/components/common/FoundationGate';
import { firebase } from '@/firebase/client';
import { updateSessionStatus, watchClassIds, watchProfile, watchSessions } from '@/firebase/queries';
import type { LiveSession } from '@/types/sprint2';
import type { UserProfile } from '@/types/user';

interface LabSyncContextValue {
  activeUser: UserProfile;
  sessions: LiveSession[];
  loadingSessions: boolean;
  error: string;
  openSession: (id: string) => void;
  closeSession: (id: string) => void;
  logout: () => void;
}

const LabSyncContext = createContext<LabSyncContextValue | null>(null);

export function LabSyncProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>();
  const [authError, setAuthError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!firebase) return;
    return onAuthStateChanged(firebase.auth, (user) => {
      setAuthError('');
      setUid(user?.uid ?? null);
    }, () => setAuthError('Sesi login gagal dimuat.'));
  }, [attempt]);

  if (!firebase) return <FoundationGate message="Salin .env.example ke .env.local lalu mulai ulang Expo." />;
  if (authError) return <FoundationGate message={authError} onRetry={() => { setAuthError(''); setAttempt(attempt + 1); }} />;
  if (uid === undefined) return <FoundationGate message="Memuat sesi login…" loading />;
  if (uid === null) return <FoundationGate login />;
  return <AccountProvider key={uid} uid={uid}>{children}</AccountProvider>;
}

function AccountProvider({ children, uid }: { children: ReactNode; uid: string }) {
  const [profile, setProfile] = useState<UserProfile | null>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!firebase) return;
    return watchProfile(firebase.db, uid, setProfile, () => setError('Profil gagal dimuat.'));
  }, [uid, attempt]);

  const logout = () => {
    if (firebase) void signOut(firebase.auth).catch(() => setError('Logout gagal. Coba lagi.'));
  };

  if (error) return <FoundationGate message={error} onRetry={() => { setError(''); setAttempt(attempt + 1); }} onLogout={logout} />;
  if (profile === undefined) return <FoundationGate message="Memuat profil…" loading />;
  if (!profile) return <FoundationGate message="Profil akun belum tersedia. Hubungi pengelola LabSync." onLogout={logout} />;
  return <SessionProvider profile={profile} logout={logout}>{children}</SessionProvider>;
}

function SessionProvider({ children, profile, logout }: { children: ReactNode; profile: UserProfile; logout: () => void }) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [readError, setReadError] = useState('');
  const [writeError, setWriteError] = useState('');

  useEffect(() => {
    if (!firebase) return;
    const { db } = firebase;
    let stopSessions: (() => void)[] = [];
    const stopClasses = watchClassIds(db, profile, (ids) => {
      stopSessions.forEach((stop) => stop());
      const snapshots = new Map<string, LiveSession[]>();
      setSessions([]);
      setReadError('');
      setLoadingSessions(ids.length > 0);
      stopSessions = ids.map((id) => watchSessions(db, id, (items) => {
        snapshots.set(id, items);
        setSessions([...snapshots.values()].flat().sort((a, b) =>
          a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
        if (snapshots.size === ids.length) setLoadingSessions(false);
      }, () => {
        setLoadingSessions(false);
        setReadError('Jadwal gagal dimuat. Cek koneksi lalu buka kembali aplikasi.');
      }));
    }, () => {
      stopSessions.forEach((stop) => stop());
      setSessions([]);
      setLoadingSessions(false);
      setReadError('Data kelas gagal dimuat.');
    });

    return () => {
      stopClasses();
      stopSessions.forEach((stop) => stop());
    };
  }, [profile]);

  const changeStatus = (id: string, status: 'DIBUKA' | 'SELESAI') => {
    if (!firebase) return;
    setWriteError('');
    void updateSessionStatus(firebase.db, id, status).catch(() => {
      setWriteError('Status sesi gagal disimpan. Cek koneksi atau muat ulang jadwal.');
    });
  };

  return (
    <LabSyncContext.Provider value={{
      activeUser: profile, sessions, loadingSessions, error: writeError || readError,
      openSession: (id) => changeStatus(id, 'DIBUKA'),
      closeSession: (id) => changeStatus(id, 'SELESAI'),
      logout,
    }}>
      {children}
    </LabSyncContext.Provider>
  );
}

export function useLabSync() {
  const context = useContext(LabSyncContext);
  if (!context) throw new Error('useLabSync must be used inside LabSyncProvider');
  return context;
}
