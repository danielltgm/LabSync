import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Query,
} from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { firebase } from '@/firebase/client';
import { createActions, type ActionName, type ActionSignatures } from './actions';
import { createDemoState, DEMO_ACCOUNTS, type DemoState } from './demo-seed';
import { classesForUser } from './selectors';
import type {
  AppNotification,
  Assignment,
  Attendance,
  AuditEntry,
  CheckInAttempt,
  ClassGroup,
  Course,
  Fine,
  Lab,
  LeaveRequest,
  NavSlot,
  PaymentTransaction,
  Quiz,
  QuizAttempt,
  Session,
  User,
} from './types';

export type { NewClassInput, QuizInput } from './actions';

/*
 * App data, live from Firestore. Reads are realtime subscriptions scoped to what the signed-in user
 * may see (matching firestore.rules); every change goes to the server (POST /api/act), which runs
 * the shared logic in src/data/actions.ts and writes the result. The UI reads `state` with the
 * same shape the demo used, so screens and selectors didn't change.
 */

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: 'default' | 'success' | 'danger' | 'push';
  href?: string;
}

/** Every action returns a promise of what the server returned. */
type AsyncActions = { [K in ActionName]: (...args: Parameters<ActionSignatures[K]>) => Promise<ReturnType<ActionSignatures[K]>> };

export interface RegisterInput {
  nim: string;
  name: string;
  email: string;
  password: string;
}

interface StoreValue extends AsyncActions {
  /** Auth and the first data snapshots have arrived. */
  ready: boolean;
  /** Firebase isn't configured in this build (missing EXPO_PUBLIC_FIREBASE_*). */
  offline: boolean;
  /** Demo mode (EXPO_PUBLIC_DEMO_MODE=1): sample data in memory, no Firebase, any password. */
  demo: boolean;
  state: DemoState;
  me: User | null;
  /** Signed in but no profile document (account exists only in Auth). */
  missingProfile: boolean;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  /** NIM/NIP or email + password. Throws an Error whose message is a short code. */
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

/** API routes live next to the web app; native builds call the deployed web app. */
const API_BASE = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

const EMPTY: DemoState = {
  version: 0,
  users: [],
  labs: [],
  courses: [],
  classes: [],
  sessions: [],
  attendance: [],
  leaves: [],
  fines: [],
  payments: [],
  notifications: [],
  attempts: [],
  assignments: [],
  grades: {},
  log: [],
  quizzes: [],
  quizAttempts: [],
  navPrefs: {},
  qrSecrets: {},
};

/** Raw collections as they arrive from Firestore. */
interface Raw {
  me?: (User & { navSlots?: NavSlot[] }) | null;
  users: User[];
  labs: (Lab & { photos?: string[] })[];
  labPhotos: { id: string; labId: string; dataUrl: string }[];
  courses: Course[];
  classes: ClassGroup[];
  sessions: Session[];
  attendance: Attendance[];
  leaves: LeaveRequest[];
  fines: Fine[];
  payments: PaymentTransaction[];
  attempts: CheckInAttempt[];
  notifications: AppNotification[];
  assignments: Assignment[];
  grades: { id: string; score: number }[];
  log: AuditEntry[];
  quizzes: Quiz[];
  quizKeys: { id: string; keys: Record<string, { correct?: number; answerKey?: string }> }[];
  quizAttempts: QuizAttempt[];
  secrets: { id: string; secret: string }[];
}

/** Raw data is tagged with the NIM it was loaded for; anything else is ignored (no leaks across account switches). */
type Owned = Raw & { owner: string | null; loaded: string[] };

const RAW_EMPTY: Omit<Raw, 'me'> = {
  users: [],
  labs: [],
  labPhotos: [],
  courses: [],
  classes: [],
  sessions: [],
  attendance: [],
  leaves: [],
  fines: [],
  payments: [],
  attempts: [],
  notifications: [],
  assignments: [],
  grades: [],
  log: [],
  quizzes: [],
  quizKeys: [],
  quizAttempts: [],
  secrets: [],
};

const errorCode = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** EXPO_PUBLIC_DEMO_MODE=1 runs the app on sample data in memory (screenshots, showcases, offline demos). */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === '1';

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  return DEMO_MODE ? <LocalStoreProvider>{children}</LocalStoreProvider> : <FirebaseStoreProvider>{children}</FirebaseStoreProvider>;
}

const DEMO_KEY = 'labsync.demo.as';
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Who to start as on web: `?as=praktikan|asisten|admin` (or a NIM), else the last demo login. */
function initialDemoNim(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const as = new URLSearchParams(window.location.search).get('as');
    if (as) return DEMO_ACCOUNTS[as as keyof typeof DEMO_ACCOUNTS] ?? as;
    return window.localStorage.getItem(DEMO_KEY);
  } catch {
    return null;
  }
}

function rememberDemoNim(nim: string | null) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    if (nim) window.localStorage.setItem(DEMO_KEY, nim);
    else window.localStorage.removeItem(DEMO_KEY);
  } catch {
    // Storage blocked: demo login just isn't remembered.
  }
}

/**
 * Demo data lives outside React: the same shared actions (src/data/actions.ts) run on an in-memory
 * copy of the sample data, so every screen and flow works without Firebase. Nothing is saved;
 * a reload starts over.
 */
function createLocalData() {
  let state: DemoState | null = null;
  let counter = 0;
  const listeners = new Set<() => void>();
  const get = () => (state ??= createDemoState());
  return {
    get,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    run: (nim: string, name: ActionName, args: unknown[]) => {
      const actions = createActions({
        nim,
        id: (prefix) => `${prefix}-${Date.now().toString(36)}-${(counter += 1)}`,
        secret: () => Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
      });
      const fn = (actions as unknown as Record<string, (...a: unknown[]) => (d: DemoState) => unknown>)[name];
      const draft = clone(get());
      const result = fn(...args)(draft);
      state = draft;
      listeners.forEach((l) => l());
      return result;
    },
  };
}
const localData = DEMO_MODE ? createLocalData() : null;
const ACTION_NAMES = Object.keys(createActions({ nim: '', id: () => '', secret: () => '' })) as ActionName[];

function LocalStoreProvider({ children }: { children: ReactNode }) {
  const data = localData!;
  const state = useSyncExternalStore(data.subscribe, data.get, data.get);
  const [nim, setNim] = useState<string | null>(() => {
    const start = initialDemoNim();
    return start && data.get().users.some((u) => u.nim === start) ? start : null;
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo<StoreValue>(() => {
    const me = nim ? (state.users.find((u) => u.nim === nim) ?? null) : null;
    const run = async (name: ActionName, args: unknown[]) => {
      if (!nim) throw new Error('unauthenticated');
      try {
        return data.run(nim, name, args);
      } catch (e) {
        toast({ title: 'Gagal menyimpan.', body: errorCode(e), tone: 'danger' });
        throw e instanceof Error ? e : new Error(errorCode(e));
      }
    };
    const actions = Object.fromEntries(
      ACTION_NAMES.map((n) => [
        n,
        (...args: unknown[]) => {
          const p = run(n, args);
          p.catch(() => undefined);
          return p;
        },
      ]),
    ) as unknown as AsyncActions;
    const signIn = (next: string | null) => {
      setNim(next);
      rememberDemoNim(next);
    };
    return {
      ...actions,
      ready: true,
      offline: false,
      demo: true,
      state,
      me,
      missingProfile: false,
      toasts,
      toast,
      dismissToast: (id) => setToasts((all) => all.filter((t) => t.id !== id)),
      // Any password works. Accepts a sample NIM/NIP, a sample email, or a role name.
      login: async (identifier) => {
        const id = identifier.trim().toLowerCase();
        const byRole = DEMO_ACCOUNTS[id as keyof typeof DEMO_ACCOUNTS];
        const user = state.users.find((u) => u.nim === (byRole ?? id) || u.email?.toLowerCase() === id);
        if (!user) throw new Error('invalid_credentials');
        signIn(user.nim);
      },
      register: async () => {
        throw new Error('demo_mode');
      },
      resetPassword: async () => undefined,
      logout: async () => signIn(null),
    };
  }, [data, nim, state, toasts, toast]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function FirebaseStoreProvider({ children }: { children: ReactNode }) {
  const fb = firebase;
  const [authReady, setAuthReady] = useState(!fb);
  const [nim, setNim] = useState<string | null>(null);
  const [owned, setOwned] = useState<Owned>({ ...RAW_EMPTY, me: undefined, owner: null, loaded: [] });
  /** Updates the raw data for `forNim`, starting fresh when it belonged to someone else. */
  const patch = useCallback((forNim: string, fn: (r: Owned) => Partial<Owned>) => {
    setOwned((r) => {
      const base: Owned = r.owner === forNim ? r : { ...RAW_EMPTY, me: undefined, owner: forNim, loaded: [] };
      return { ...base, ...fn(base) };
    });
  }, []);
  const raw = useMemo<Owned>(() => (owned.owner === nim && nim ? owned : { ...RAW_EMPTY, me: undefined, owner: nim, loaded: [] }), [owned, nim]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenNotifications = useRef<Set<string> | null>(null);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4200);
  }, []);

  // Auth state.
  useEffect(() => {
    if (!fb) return;
    return onAuthStateChanged(fb.auth, (user) => {
      setNim(user?.uid ?? null);
      setAuthReady(true);
    });
  }, [fb]);

  // Own profile first: the role decides which queries the rules allow.
  useEffect(() => {
    if (!fb || !nim) return;
    seenNotifications.current = null;
    return onSnapshot(
      doc(fb.db, 'users', nim),
      (snap) => patch(nim, () => ({ me: snap.exists() ? ({ ...(snap.data() as User), nim: snap.id } as Raw['me']) : null })),
      () => patch(nim, () => ({ me: null })),
    );
  }, [fb, nim, patch]);

  const role = raw.me?.role;

  // Everything else, scoped by role.
  useEffect(() => {
    if (!fb || !nim || !role) return;
    const db = fb.db;
    const isAslab = role === 'ASLAB';
    const isStaff = role !== 'PRAKTIKAN';
    const mine = (name: string): Query<DocumentData> =>
      isAslab ? collection(db, name) : isStaff ? query(collection(db, name), where('staffNims', 'array-contains', nim)) : query(collection(db, name), where('nim', '==', nim));
    const staffOnly = (name: string): Query<DocumentData> | null =>
      isAslab ? collection(db, name) : isStaff ? query(collection(db, name), where('staffNims', 'array-contains', nim)) : null;
    const fineScope = (name: string): Query<DocumentData> | null =>
      isAslab ? collection(db, name) : role === 'PRAKTIKAN' ? query(collection(db, name), where('nim', '==', nim)) : null;

    const subs: [keyof Omit<Raw, 'me'>, Query<DocumentData> | null][] = [
      ['users', isStaff ? collection(db, 'users') : query(collection(db, 'users'), where('role', 'in', ['ASPRAK', 'ASLAB']))],
      ['labs', collection(db, 'labs')],
      ['labPhotos', collection(db, 'labPhotos')],
      ['courses', collection(db, 'courses')],
      ['classes', collection(db, 'classes')],
      ['sessions', collection(db, 'sessions')],
      ['assignments', collection(db, 'assignments')],
      ['attendance', mine('attendance')],
      ['leaves', mine('leaves')],
      ['fines', fineScope('fines')],
      ['payments', fineScope('payments')],
      ['attempts', mine('checkinAttempts')],
      ['grades', mine('grades')],
      ['quizAttempts', mine('quizAttempts')],
      ['notifications', query(collection(db, 'notifications'), where('nim', '==', nim))],
      ['log', staffOnly('log')],
      ['quizzes', isStaff ? staffOnly('quizzes') : query(collection(db, 'quizzes'), where('status', 'in', ['DIBUKA', 'DITUTUP']))],
      ['quizKeys', staffOnly('quizKeys')],
      ['secrets', staffOnly('sessionSecrets')],
    ];
    const unsubs = subs
      .filter(([, q]) => q)
      .map(([key, q]) =>
        onSnapshot(
          q!,
          (snap) => {
            const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
            if (key === 'notifications') {
              // Toast new notifications for me (not the ones already there when the app opened).
              const seen = seenNotifications.current;
              if (seen) {
                for (const n of items as AppNotification[]) {
                  if (!seen.has(n.id) && !n.readAt) toast({ title: n.title, body: n.body, tone: 'push', href: n.href });
                }
              }
              seenNotifications.current = new Set(items.map((n) => n.id));
            }
            patch(nim, (r) => ({ [key]: items, loaded: r.loaded.includes(key) ? r.loaded : [...r.loaded, key] }));
          },
          (err) => {
            console.warn(`subscription ${key} failed`, err.code);
            patch(nim, (r) => ({ loaded: r.loaded.includes(key) ? r.loaded : [...r.loaded, key] }));
          },
        ),
      );
    return () => unsubs.forEach((u) => u());
  }, [fb, nim, role, toast, patch]);

  // Assemble the app state the screens expect.
  const state = useMemo<DemoState>(() => {
    if (!raw.me) return EMPTY;
    const photos = new Map(raw.labPhotos.map((p) => [p.id, p.dataUrl]));
    const keys = new Map(raw.quizKeys.map((k) => [k.id, k.keys ?? {}]));
    const users = new Map(raw.users.map((u) => [u.nim ?? (u as unknown as { id: string }).id, u]));
    users.set(raw.me.nim, raw.me);
    return {
      ...EMPTY,
      users: [...users.values()].map((u) => ({ ...u, nim: u.nim ?? (u as unknown as { id: string }).id })),
      labs: raw.labs.map((l) => ({ ...l, photos: (l.photos ?? []).map((id) => photos.get(id)).filter((x): x is string => !!x) })),
      courses: raw.courses,
      classes: raw.classes,
      sessions: raw.sessions,
      attendance: raw.attendance,
      leaves: raw.leaves,
      fines: raw.fines,
      payments: raw.payments,
      attempts: raw.attempts,
      notifications: [...raw.notifications].sort((a, b) => b.createdAt - a.createdAt),
      assignments: raw.assignments,
      grades: Object.fromEntries(raw.grades.map((g) => [g.id, g.score])),
      log: [...raw.log].sort((a, b) => (a.id < b.id ? -1 : 1)),
      quizzes: raw.quizzes.map((q) => {
        const k = keys.get(q.id) ?? {};
        return { ...q, questions: q.questions.map((qq) => ({ ...qq, ...(k[qq.id] ?? {}) })) };
      }),
      quizAttempts: raw.quizAttempts,
      navPrefs: raw.me.navSlots?.length === 3 ? { [raw.me.nim]: raw.me.navSlots } : {},
      qrSecrets: Object.fromEntries(raw.secrets.map((s) => [s.id, s.secret])),
    };
  }, [raw]);

  const me = raw.me ? (state.users.find((u) => u.nim === raw.me!.nim) ?? raw.me) : null;
  const core = ['users', 'labs', 'classes', 'sessions'];
  const ready = authReady && (!nim || raw.me === null || (!!raw.me && core.every((k) => raw.loaded.includes(k))));

  const call = useCallback(
    async (action: ActionName, args: unknown[]) => {
      const user = fb?.auth.currentUser;
      if (!user) throw new Error('unauthenticated');
      // Room photos already stored go back as references, not as data.
      if (action === 'saveLab') {
        const byUrl = new Map(raw.labPhotos.map((p) => [p.dataUrl, p.id]));
        const lab = args[0] as Lab;
        args = [{ ...lab, photos: lab.photos.map((p) => (byUrl.has(p) ? `photo:${byUrl.get(p)}` : p)) }, ...args.slice(1)];
      }
      const res = await fetch(`${API_BASE}/api/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ action, args }),
      });
      const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
      if (!res.ok) {
        const code = body.error ?? `http_${res.status}`;
        toast({ title: ERROR_TEXT[code] ?? 'Gagal menyimpan. Coba lagi.', body: ERROR_TEXT[code] ? undefined : code, tone: 'danger' });
        throw new Error(code);
      }
      return body.result;
    },
    [fb, raw.labPhotos, toast],
  );

  const value = useMemo<StoreValue>(() => {
    // Failures already show a toast; the no-op catch keeps fire-and-forget calls from raising
    // unhandled rejections, while callers that await still get the error.
    const server = <K extends ActionName>(name: K) =>
      ((...args: unknown[]) => {
        const p = call(name, args);
        p.catch(() => undefined);
        return p;
      }) as unknown as AsyncActions[K];
    const db = fb?.db;
    const direct: Pick<AsyncActions, 'markRead' | 'markAllRead' | 'setNavSlots' | 'answerQuiz'> = {
      markRead: async (id) => {
        if (db) await updateDoc(doc(db, 'notifications', id), { readAt: Date.now() });
      },
      markAllRead: async () => {
        if (!db || !nim) return;
        const batch = writeBatch(db);
        for (const n of state.notifications) if (!n.readAt) batch.update(doc(db, 'notifications', n.id), { readAt: Date.now() });
        await batch.commit();
      },
      setNavSlots: async (slots) => {
        if (db && nim) await updateDoc(doc(db, 'users', nim), { navSlots: slots ?? [] });
      },
      answerQuiz: async (quizId, questionId, value) => {
        if (db && nim) await updateDoc(doc(db, 'quizAttempts', `${quizId}__${nim}`), { [`answers.${questionId}`]: value });
      },
    };
    const names: ActionName[] = [
      'checkIn', 'openSession', 'closeSession', 'updateSession', 'createSessions', 'submitLeave', 'reviewLeave', 'overrideAttendance',
      'setClassLinks', 'saveQuiz', 'deleteQuiz', 'setQuizStatus', 'startQuiz', 'reportViolation', 'submitQuiz', 'allowReentry',
      'gradeAnswer', 'saveLab', 'deleteLab', 'setRole', 'addUser', 'setClassAssistant', 'createClass', 'addAssignment', 'updateAssignment',
      'deleteAssignment', 'setGrades', 'enroll', 'unenroll', 'transferStudent', 'bulkInsertLabs', 'bulkInsertStudents', 'bulkInsertAssistants',
    ];
    const serverActions = Object.fromEntries(names.map((n) => [n, server(n)])) as unknown as Omit<AsyncActions, keyof typeof direct>;

    return {
      ...serverActions,
      ...direct,
      ready,
      offline: !fb,
      demo: false,
      state,
      me,
      missingProfile: !!nim && raw.me === null,
      toasts,
      toast,
      dismissToast: (id) => setToasts((all) => all.filter((t) => t.id !== id)),
      login: async (identifier, password) => {
        if (!fb) throw new Error('offline');
        const id = identifier.trim();
        try {
          if (id.includes('@')) {
            await signInWithEmailAndPassword(fb.auth, id, password);
            return;
          }
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nim: id, password }),
          });
          const body = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
          if (!res.ok || !body.token) throw new Error(body.error ?? 'invalid_credentials');
          await signInWithCustomToken(fb.auth, body.token);
        } catch (e) {
          const code = (e as { code?: string }).code;
          if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') throw new Error('invalid_credentials');
          if (code === 'auth/too-many-requests') throw new Error('too_many_attempts');
          throw e instanceof Error ? e : new Error(errorCode(e));
        }
      },
      register: async (input) => {
        if (!fb) throw new Error('offline');
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? 'register_failed');
        await signInWithEmailAndPassword(fb.auth, input.email.trim().toLowerCase(), input.password);
      },
      resetPassword: async (email) => {
        if (!fb) throw new Error('offline');
        await sendPasswordResetEmail(fb.auth, email.trim());
      },
      logout: async () => {
        if (fb) await signOut(fb.auth);
      },
    };
  }, [call, fb, nim, raw.me, ready, state, me, toasts, toast]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Server error codes → what to tell the user. */
const ERROR_TEXT: Record<string, string> = {
  unauthenticated: 'Sesi login habis. Masuk lagi.',
  forbidden: 'Kamu tidak punya akses untuk ini.',
  not_class_staff: 'Hanya asisten kelas ini yang bisa mengubahnya.',
  not_member: 'Kamu tidak terdaftar di kelas ini.',
  no_profile: 'Profil akunmu belum ada. Hubungi koordinator.',
  server_not_configured: 'Server belum dikonfigurasi (kunci Firebase Admin).',
  photo_too_large: 'Foto terlalu besar.',
  class_not_found: 'Kelas tidak ditemukan.',
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside DemoStoreProvider');
  return ctx;
}

/** Signed-in user; screens under (app) can rely on it. */
export function useMe() {
  const { me } = useStore();
  if (!me) throw new Error('No signed-in user');
  return me;
}

export function useMyClasses() {
  const { state } = useStore();
  const me = useMe();
  return useMemo(() => classesForUser(state, me), [state, me]);
}

export function useUnreadCount() {
  const { state, me } = useStore();
  return state.notifications.filter((n) => n.nim === me?.nim && !n.readAt).length;
}
