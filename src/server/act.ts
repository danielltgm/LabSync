import { createHash, randomBytes } from 'node:crypto';

import { createActions, type ActionName } from '@/data/actions';
import type { DemoState } from '@/data/demo-seed';
import type { AuditEntry, ClassGroup, Quiz, Role, User } from '@/data/types';
import { classifyReason } from '@/server/classify-leave';
import { getAdminApp, getAuth, getFirestore } from '@/server/firebase-admin';

/*
 * POST /api/act  { action, args }  with  Authorization: Bearer <Firebase ID token>
 *
 * Runs one shared action (src/data/actions.ts) against Firestore:
 *   1. verify the caller and load their profile (uid == NIM),
 *   2. in a transaction, load the documents the action touches into a draft state,
 *   3. authorize, run the action on the draft, and write back every document that changed
 *      (plus new notifications and audit entries, chained to the latest entry),
 *   4. afterwards: propagate class staff changes, create Auth accounts for new staff.
 */

type Db = ReturnType<typeof getFirestore>;
type Tx = Parameters<Parameters<Db['runTransaction']>[0]>[0];
type Doc = Record<string, unknown>;

const headers = { 'Cache-Control': 'private, no-store' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

/** Collections that hold class-scoped records and carry `classId` + `staffNims`. */
const CLASS_SCOPED = ['attendance', 'leaves', 'checkinAttempts', 'grades', 'log', 'quizzes', 'quizKeys', 'quizAttempts', 'sessionSecrets'] as const;

/** Actions any signed-in member may run on themselves. Everything else needs staff of the class. */
const STUDENT_ACTIONS = new Set<ActionName>(['checkIn', 'submitLeave', 'startQuiz', 'reportViolation', 'submitQuiz']);
/** Koordinator-only actions. */
const ADMIN_ACTIONS = new Set<ActionName>(['setRole', 'addUser', 'setClassAssistant', 'createClass', 'deleteLab']);
/** Handled by the client directly under Firestore rules; not accepted here. */
const CLIENT_ACTIONS = new Set<ActionName>(['markRead', 'markAllRead', 'setNavSlots', 'answerQuiz']);

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function emptyState(): DemoState {
  return {
    version: 0,
    users: [],
    labs: [],
    courses: [],
    classes: [],
    sessions: [],
    attendance: [],
    leaves: [],
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
}

const strip = <T extends Doc>(d: T) => {
  const { classId: _c, staffNims: _s, ...rest } = d as Doc;
  return rest;
};

/** What an action needs loaded, derived from its arguments. */
interface Plan {
  classId?: string;
  sessionId?: string;
  leaveId?: string;
  quizId?: string;
  nims: string[];
  attendance?: boolean;
  leaves?: boolean;
  grades?: boolean;
  quizAttempts?: boolean;
  allCourses?: boolean;
  allLabs?: boolean;
}

async function resolvePlan(tx: Tx, db: Db, action: ActionName, args: unknown[]): Promise<Plan> {
  const a0 = args[0] as Record<string, unknown> | string | undefined;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const classOfSession = async (id: string) => (await tx.get(db.doc(`sessions/${id}`))).get('classId') as string | undefined;
  const classOfQuiz = async (id: string) => (await tx.get(db.doc(`quizzes/${id}`))).get('classId') as string | undefined;
  const plan: Plan = { nims: [], allLabs: true };

  switch (action) {
    case 'checkIn': {
      const sessionId = str((a0 as { sessionId?: string })?.sessionId);
      return { ...plan, sessionId, classId: sessionId && (await classOfSession(sessionId)), attendance: true };
    }
    case 'openSession':
    case 'updateSession':
      return { ...plan, sessionId: str(a0), classId: str(a0) && (await classOfSession(a0 as string)) };
    case 'closeSession':
      return { ...plan, sessionId: str(a0), classId: str(a0) && (await classOfSession(a0 as string)), attendance: true, leaves: true };
    case 'overrideAttendance':
      return { ...plan, sessionId: str(a0), classId: str(a0) && (await classOfSession(a0 as string)), attendance: true, nims: [String(args[1])] };
    case 'submitLeave': {
      const sessionId = str((a0 as { sessionId?: string })?.sessionId);
      return { ...plan, sessionId, classId: sessionId && (await classOfSession(sessionId)), leaves: true };
    }
    case 'reviewLeave': {
      const leave = await tx.get(db.doc(`leaves/${String(a0)}`));
      const sessionId = leave.get('sessionId') as string | undefined;
      return { ...plan, leaveId: String(a0), sessionId, classId: leave.get('classId'), attendance: true, leaves: true, nims: [leave.get('nim')] };
    }
    case 'createSessions':
    case 'addAssignment':
      return { ...plan, classId: str((a0 as { classId?: string })?.classId) };
    case 'setClassAssistant':
    case 'enroll':
    case 'unenroll':
    case 'setClassLinks':
      return { ...plan, classId: str(a0), nims: action === 'enroll' ? ((args[1] as string[]) ?? []) : action === 'setClassLinks' ? [] : [String(args[1])] };
    case 'updateAssignment':
    case 'deleteAssignment': {
      const classId = (await tx.get(db.doc(`assignments/${String(a0)}`))).get('classId');
      return { ...plan, classId, grades: true };
    }
    case 'setGrades': {
      const changes = (a0 as unknown as { assignmentId: string; nim: string }[]) ?? [];
      const classId = changes[0] ? (await tx.get(db.doc(`assignments/${changes[0].assignmentId}`))).get('classId') : undefined;
      return { ...plan, classId, grades: true, nims: changes.map((c) => c.nim) };
    }
    case 'saveQuiz': {
      const input = a0 as { id?: string; sessionId?: string };
      const classId = input?.id ? await classOfQuiz(input.id) : input?.sessionId ? await classOfSession(input.sessionId) : undefined;
      return { ...plan, classId, sessionId: input?.sessionId, quizId: input?.id };
    }
    case 'deleteQuiz':
    case 'setQuizStatus':
    case 'startQuiz':
    case 'reportViolation':
    case 'submitQuiz': {
      const quiz = await tx.get(db.doc(`quizzes/${String(a0)}`));
      return { ...plan, quizId: String(a0), classId: quiz.get('classId'), sessionId: quiz.get('sessionId'), attendance: action === 'startQuiz', grades: true, quizAttempts: true };
    }
    case 'allowReentry':
    case 'gradeAnswer': {
      const attempt = await tx.get(db.doc(`quizAttempts/${String(a0)}`));
      const quiz = await tx.get(db.doc(`quizzes/${attempt.get('quizId')}`));
      return { ...plan, quizId: quiz.id, classId: quiz.get('classId'), grades: true, quizAttempts: true, nims: [attempt.get('nim')] };
    }
    case 'createClass': {
      const input = a0 as { assistantNims?: string[]; studentNims?: string[] };
      return { ...plan, allCourses: true, nims: [...(input?.assistantNims ?? []), ...(input?.studentNims ?? [])] };
    }
    case 'setRole':
      return { ...plan, nims: [String(a0)] };
    case 'addUser':
      return { ...plan, nims: [String((a0 as { nim?: string })?.nim)] };
    case 'saveLab':
    case 'deleteLab':
      return plan;
    default:
      throw new HttpError(400, 'unknown_action');
  }
}

/** Loads the plan into a draft. Returns the draft, a deep "before" copy, and which collections were loaded. */
async function load(tx: Tx, db: Db, plan: Plan, meNim: string) {
  const s = emptyState();
  const loaded = new Set<keyof DemoState>(['users', 'labs', 'log', 'notifications']);
  const docs = (snap: { docs: { id: string; data: () => Doc }[] }) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let cls: ClassGroup | undefined;
  if (plan.classId) {
    const c = await tx.get(db.doc(`classes/${plan.classId}`));
    if (!c.exists) throw new HttpError(404, 'class_not_found');
    cls = { ...(c.data() as ClassGroup), id: c.id };
    s.classes = [cls];
    loaded.add('classes');
    const course = await tx.get(db.doc(`courses/${cls.courseId}`));
    if (course.exists) s.courses = [{ ...(course.data() as DemoState['courses'][number]), id: course.id }];
    loaded.add('courses');
    s.sessions = docs(await tx.get(db.collection('sessions').where('classId', '==', cls.id))) as unknown as DemoState['sessions'];
    loaded.add('sessions');
    s.assignments = docs(await tx.get(db.collection('assignments').where('classId', '==', cls.id))) as unknown as DemoState['assignments'];
    loaded.add('assignments');
    // Quizzes with their answer keys merged back in.
    const [quizzes, keys] = await Promise.all([
      tx.get(db.collection('quizzes').where('classId', '==', cls.id)),
      tx.get(db.collection('quizKeys').where('classId', '==', cls.id)),
    ]);
    const keyMap = new Map(keys.docs.map((k) => [k.id, (k.get('keys') ?? {}) as Record<string, { correct?: number; answerKey?: string }>]));
    s.quizzes = quizzes.docs.map((q) => {
      const data = strip(q.data()) as unknown as Quiz;
      const k = keyMap.get(q.id) ?? {};
      return { ...data, id: q.id, questions: data.questions.map((qq) => ({ ...qq, ...(k[qq.id] ?? {}) })) };
    });
    loaded.add('quizzes');
    const secrets = await tx.get(db.collection('sessionSecrets').where('classId', '==', cls.id));
    s.qrSecrets = Object.fromEntries(secrets.docs.map((d) => [d.id, String(d.get('secret'))]));
    loaded.add('qrSecrets');
  }
  if (plan.allCourses) {
    s.courses = docs(await tx.get(db.collection('courses'))) as unknown as DemoState['courses'];
    loaded.add('courses');
  }
  if (plan.allLabs) {
    s.labs = docs(await tx.get(db.collection('labs'))) as unknown as DemoState['labs'];
  }
  if (plan.attendance && plan.sessionId) {
    s.attendance = docs(await tx.get(db.collection('attendance').where('sessionId', '==', plan.sessionId))).map(strip) as unknown as DemoState['attendance'];
    loaded.add('attendance');
  }
  if (plan.leaves) {
    const q = plan.leaveId ? await tx.get(db.collection('leaves').where('__name__', '==', db.doc(`leaves/${plan.leaveId}`))) : await tx.get(db.collection('leaves').where('sessionId', '==', plan.sessionId ?? ''));
    s.leaves = docs(q).map(strip) as unknown as DemoState['leaves'];
    loaded.add('leaves');
  }
  if (plan.grades && cls) {
    const g = await tx.get(db.collection('grades').where('classId', '==', cls.id));
    s.grades = Object.fromEntries(g.docs.map((d) => [d.id, Number(d.get('score'))]));
    loaded.add('grades');
  }
  if (plan.quizAttempts && plan.quizId) {
    s.quizAttempts = docs(await tx.get(db.collection('quizAttempts').where('quizId', '==', plan.quizId))).map(strip) as unknown as DemoState['quizAttempts'];
    loaded.add('quizAttempts');
  }

  // People: the caller, the class, and anyone the action names.
  const nims = new Set([meNim, ...plan.nims.filter(Boolean), ...(cls ? [...cls.assistantNims, ...cls.studentNims] : [])]);
  const refs = [...nims].filter((n) => /^[\w.-]{3,40}$/.test(n)).map((n) => db.doc(`users/${n}`));
  const users = refs.length ? await tx.getAll(...refs) : [];
  s.users = users.filter((u) => u.exists).map((u) => ({ ...(u.data() as User), nim: u.id }));

  // Newest audit entry only (meta/auditHead points to it): new entries chain onto its hash.
  const head = await tx.get(db.doc('meta/auditHead'));
  const lastId = head.get('lastId') as string | undefined;
  const last = lastId ? await tx.get(db.doc(`log/${lastId}`)) : null;
  s.log = last?.exists ? [{ ...(strip(last.data()!) as unknown as AuditEntry), id: last.id }] : [];

  return { state: s, before: JSON.parse(JSON.stringify(s)) as DemoState, loaded, cls };
}

function authorize(action: ActionName, me: User, cls: ClassGroup | undefined) {
  if (CLIENT_ACTIONS.has(action)) throw new HttpError(400, 'client_action');
  if (me.role === 'SUPERADMIN') return;
  if (ADMIN_ACTIONS.has(action)) throw new HttpError(403, 'forbidden');
  if (STUDENT_ACTIONS.has(action)) {
    // Students act on themselves, in classes they belong to (the actions use the caller's NIM).
    if (me.role === 'PRAKTIKAN' && cls && !cls.studentNims.includes(me.nim)) throw new HttpError(403, 'not_member');
    return;
  }
  if (me.role !== 'ASISTEN') throw new HttpError(403, 'forbidden');
  if (action === 'saveLab') return; // asisten may adjust room radius/photos, as in the UI
  if (!cls || !cls.assistantNims.includes(me.nim)) throw new HttpError(403, 'not_class_staff');
}

/** Writes every changed document. Returns staff-change propagation work for after the commit. */
function writeChanges(tx: Tx, db: Db, before: DemoState, after: DemoState, loaded: Set<keyof DemoState>) {
  const classes = new Map(after.classes.map((c) => [c.id, c]));
  const staffOf = (classId?: string) => (classId ? (classes.get(classId)?.assistantNims ?? []) : []);
  const sessionClass = new Map(after.sessions.map((s) => [s.id, s.classId]));
  const assignmentClass = new Map(after.assignments.map((a) => [a.id, a.classId]));
  const quizClass = new Map(after.quizzes.map((q) => [q.id, q.classId]));
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

  const syncList = <T extends { id: string }>(key: keyof DemoState, coll: string, extra: (item: T) => Doc = () => ({}), canDelete = true) => {
    if (!loaded.has(key)) {
      // Not loaded: only additions are possible (e.g. notifications, check-in attempts).
      for (const item of after[key] as unknown as T[]) tx.set(db.doc(`${coll}/${item.id}`), { ...item, ...extra(item) });
      return;
    }
    const prev = new Map((before[key] as unknown as T[]).map((x) => [x.id, x]));
    const next = new Map((after[key] as unknown as T[]).map((x) => [x.id, x]));
    for (const [id, item] of next) if (!same(prev.get(id), item)) tx.set(db.doc(`${coll}/${id}`), { ...item, ...extra(item) });
    if (canDelete) for (const id of prev.keys()) if (!next.has(id)) tx.delete(db.doc(`${coll}/${id}`));
  };

  syncList('users', 'users', () => ({}), false);
  syncList('labs', 'labs');
  syncList('courses', 'courses', () => ({}), false);
  syncList('classes', 'classes', () => ({}), false);
  syncList('sessions', 'sessions');
  syncList('assignments', 'assignments');
  syncList<{ id: string; sessionId: string }>('attendance', 'attendance', (a) => ({ classId: sessionClass.get(a.sessionId), staffNims: staffOf(sessionClass.get(a.sessionId)) }));
  syncList<{ id: string; sessionId: string }>('leaves', 'leaves', (l) => ({ classId: sessionClass.get(l.sessionId), staffNims: staffOf(sessionClass.get(l.sessionId)) }));
  syncList<{ id: string; sessionId: string }>('attempts', 'checkinAttempts', (a) => ({ classId: sessionClass.get(a.sessionId), staffNims: staffOf(sessionClass.get(a.sessionId)) }));
  syncList<{ id: string; quizId: string }>('quizAttempts', 'quizAttempts', (a) => ({ classId: quizClass.get(a.quizId), staffNims: staffOf(quizClass.get(a.quizId)) }));

  // Notifications: never loaded on the server, so everything in the draft is new.
  for (const n of after.notifications) tx.set(db.doc(`notifications/${n.id}`), n);

  // Audit log: append-only.
  const known = new Set(before.log.map((e) => e.id));
  const added = after.log.filter((e) => !known.has(e.id));
  for (const e of added) tx.create(db.doc(`log/${e.id}`), { ...e, staffNims: staffOf(e.classId) });
  if (added.length) tx.set(db.doc('meta/auditHead'), { lastId: added[added.length - 1].id, hash: added[added.length - 1].hash });

  // Quizzes: questions go public without answers; answers go to quizKeys (staff only).
  if (loaded.has('quizzes')) {
    const prev = new Map(before.quizzes.map((q) => [q.id, q]));
    const next = new Map(after.quizzes.map((q) => [q.id, q]));
    for (const [id, quiz] of next) {
      if (same(prev.get(id), quiz)) continue;
      const keys: Record<string, { correct?: number; answerKey?: string }> = {};
      const questions = quiz.questions.map(({ correct, answerKey, ...rest }) => {
        keys[rest.id] = { ...(correct !== undefined ? { correct } : {}), ...(answerKey ? { answerKey } : {}) };
        return rest;
      });
      const staffNims = staffOf(quiz.classId);
      tx.set(db.doc(`quizzes/${id}`), { ...quiz, questions, staffNims });
      tx.set(db.doc(`quizKeys/${id}`), { classId: quiz.classId, staffNims, keys });
    }
    for (const id of prev.keys()) {
      if (next.has(id)) continue;
      tx.delete(db.doc(`quizzes/${id}`));
      tx.delete(db.doc(`quizKeys/${id}`));
    }
  }

  // Grades: a record keyed `${assignmentId}__${nim}`.
  if (loaded.has('grades')) {
    for (const [key, score] of Object.entries(after.grades)) {
      if (before.grades[key] === score) continue;
      const [assignmentId, nim] = key.split('__');
      const classId = assignmentClass.get(assignmentId);
      tx.set(db.doc(`grades/${key}`), { assignmentId, nim, classId, score, staffNims: staffOf(classId) });
    }
    for (const key of Object.keys(before.grades)) if (!(key in after.grades)) tx.delete(db.doc(`grades/${key}`));
  }

  // QR secrets of open sessions.
  for (const [sessionId, secret] of Object.entries(after.qrSecrets)) {
    if (before.qrSecrets[sessionId] === secret) continue;
    const classId = sessionClass.get(sessionId);
    tx.set(db.doc(`sessionSecrets/${sessionId}`), { secret, classId, staffNims: staffOf(classId) });
  }

  // Classes whose asisten changed: their records' access lists must follow.
  return before.classes
    .map((c) => ({ c, next: classes.get(c.id) }))
    .filter(({ c, next }) => next && !same(c.assistantNims, next.assistantNims))
    .map(({ next }) => ({ classId: next!.id, staffNims: next!.assistantNims }));
}

async function propagateStaff(db: Db, classId: string, staffNims: string[]) {
  const writer = db.bulkWriter();
  for (const coll of CLASS_SCOPED) {
    const snap = await db.collection(coll).where('classId', '==', classId).get();
    for (const d of snap.docs) writer.update(d.ref, { staffNims });
  }
  await writer.close();
}

/** Lab photos arrive as data URIs (new) or `photo:<id>` (kept); stored one per doc in labPhotos. */
async function storeLabPhotos(db: Db, args: unknown[]) {
  const lab = args[0] as { id: string; photos?: string[] };
  if (!lab?.photos) return;
  const ids: string[] = [];
  for (const p of lab.photos.slice(0, 8)) {
    if (p.startsWith('photo:')) {
      ids.push(p.slice(6));
      continue;
    }
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(p) || p.length > 900_000) throw new HttpError(413, 'photo_too_large');
    const id = createHash('sha256').update(p).digest('hex').slice(0, 24);
    await db.doc(`labPhotos/${id}`).set({ labId: lab.id, dataUrl: p });
    ids.push(id);
  }
  lab.photos = ids;
}

export async function handleAct(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({ error: 'unauthenticated' }, 401);
  const app = getAdminApp();
  if (!app) return json({ error: 'server_not_configured' }, 503);

  let nim: string;
  try {
    ({ uid: nim } = await getAuth(app).verifyIdToken(token));
  } catch {
    return json({ error: 'unauthenticated' }, 401);
  }
  let body: { action?: ActionName; args?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const action = body.action;
  const args = Array.isArray(body.args) ? body.args : [];
  if (!action) return json({ error: 'bad_request' }, 400);

  const db = getFirestore(app);
  const actions = createActions({
    nim,
    id: (prefix) => `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`,
    secret: () => randomBytes(16).toString('hex'),
  });
  const fn = (actions as unknown as Record<string, (...a: unknown[]) => (d: DemoState) => unknown>)[action];
  if (!fn) return json({ error: 'unknown_action' }, 400);

  try {
    if (action === 'saveLab') await storeLabPhotos(db, args);
    const outcome = await db.runTransaction(async (tx) => {
      const plan = await resolvePlan(tx, db, action, args);
      const { state, before, loaded, cls } = await load(tx, db, plan, nim);
      const me = state.users.find((u) => u.nim === nim);
      if (!me) throw new HttpError(403, 'no_profile');
      authorize(action, me, cls);
      const result = fn(...args)(state);
      const staffChanges = writeChanges(tx, db, before, state, loaded);
      return { result, staffChanges, created: state.users.filter((u) => !before.users.some((b) => b.nim === u.nim)) };
    });

    for (const change of outcome.staffChanges) await propagateStaff(db, change.classId, change.staffNims);
    // Koordinator-created staff accounts get an Auth login (they set their own password via reset email).
    if (action === 'addUser') {
      const u = args[0] as User & { role: Role };
      if (u.email) {
        await getAuth(app)
          .createUser({ uid: u.nim, email: u.email, displayName: u.name, password: randomBytes(18).toString('base64url') })
          .catch((e: { code?: string }) => {
            if (e.code !== 'auth/uid-already-exists' && e.code !== 'auth/email-already-exists') throw e;
          });
      }
    }
    // Leave requests start with the keyword category; refine it with Gemini when configured.
    if (action === 'submitLeave' && typeof outcome.result === 'string') {
      const reason = String((args[0] as { reason?: string })?.reason ?? '');
      const category = await classifyReason(reason).catch(() => null);
      if (category) await db.doc(`leaves/${outcome.result}`).update({ category }).catch(() => undefined);
    }
    return json({ result: outcome.result ?? null });
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error('act failed', action, e);
    return json({ error: 'internal' }, 500);
  }
}
