import { classifyByKeywords, type LeaveCategory } from '@/firebase/ai-classifier';
import { evaluateCheckIn, type CheckInVerdict } from '@/lib/attendance-rules';
import { formatDate, formatTimeRange, HOUR, MINUTE } from '@/lib/format';
import {
  bulkInsertAssistants,
  bulkInsertLabs,
  bulkInsertStudents,
  transferStudent,
  type BulkAssistantsInput,
  type BulkLabsInput,
  type BulkStudentsInput,
  type TransferStudentInput,
} from './actions-aslab';
import { onAttendanceRecorded, onLeaveApproved } from './actions-fine';
import { appendLog, type AuditDraft } from './audit';
import type { DemoState } from './demo-seed';
import { attemptFor, quizScore } from './quiz';
import { attendanceFor, gradeKey, labDiff, leaveFor, viewSession } from './selectors';
import type {
  AppNotification,
  Assignment,
  AttendanceStatus,
  CheckInMethod,
  Lab,
  LeaveDecision,
  NavSlot,
  NotificationType,
  Position,
  Quiz,
  QuizAttempt,
  Role,
  Session,
  User,
  ViolationKind,
} from './types';

/*
 * The app's business logic, shared by the server and (for types) the client.
 * Every action is `(...args) => (draft) => result`: it mutates a draft of the app state and returns
 * a result. The server loads the documents an action needs into a draft, runs the action, then
 * writes back whatever changed (see src/server/act.ts). The UI never runs these directly; it calls
 * POST /api/act and sees the result through its Firestore subscriptions.
 */

export interface QuizInput {
  id?: string;
  sessionId: string;
  title: string;
  durationMin: number;
  maxWarnings: number;
  shuffle: boolean;
  requireAttendance: boolean;
  questions: Quiz['questions'];
  /** Weight in the grade book, or null to keep the quiz out of it. */
  gradeWeight: number | null;
}

export interface NewClassInput {
  /** Existing course, or a new one when `newCourse` is set. */
  courseId?: string;
  newCourse?: { name: string; code: string };
  label: string;
  labId: string;
  /** Start of the day of the first meeting. Its weekday becomes the class's weekday. */
  firstDay: number;
  startTime: string;
  durationMin: number;
  meetings: number;
  assistantNims: string[];
  studentNims: string[];
}

/** Signatures of every action as the UI sees them (results arrive asynchronously from the server). */
export interface ActionSignatures {
  checkIn: (input: { sessionId: string; method: CheckInMethod; position?: Position | null; qrToken?: string }) => CheckInVerdict;
  openSession: (sessionId: string) => number;
  closeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, patch: Partial<Pick<Session, 'topic' | 'description' | 'startsAt' | 'endsAt' | 'labId' | 'lateAfterMin' | 'materials' | 'status'>>, changeNote?: string) => number;
  createSessions: (input: { classId: string; topic: string; description: string; startsAt: number; durationMin: number; labId: string; repeatWeeks: number; materials?: Session['materials'] }) => string[];
  submitLeave: (input: { sessionId: string; reason: string; attachmentName?: string }) => string;
  reviewLeave: (leaveId: string, decision: Exclude<LeaveDecision, 'pending'>, note?: string) => void;
  overrideAttendance: (sessionId: string, nim: string, status: AttendanceStatus | null, note?: string) => void;
  setNavSlots: (slots: NavSlot[] | null) => void;
  setClassLinks: (classId: string, links: Session['materials']) => void;
  saveQuiz: (input: QuizInput) => string;
  deleteQuiz: (quizId: string) => void;
  setQuizStatus: (quizId: string, status: 'DIBUKA' | 'DITUTUP') => void;
  startQuiz: (quizId: string) => { ok: true } | { ok: false; reason: 'TUTUP' | 'BELUM_PRESENSI' | 'SELESAI' };
  answerQuiz: (quizId: string, questionId: string, value: number | string) => void;
  reportViolation: (quizId: string, kind: ViolationKind) => { left: number; kicked: boolean };
  submitQuiz: (quizId: string, cause: 'manual' | 'waktu') => void;
  allowReentry: (attemptId: string, reason?: string) => void;
  gradeAnswer: (attemptId: string, questionId: string, score: number) => void;
  saveLab: (lab: Lab) => void;
  deleteLab: (labId: string) => void;
  setRole: (nim: string, role: Role) => void;
  addUser: (user: User) => void;
  setClassAssistant: (classId: string, nim: string, assigned: boolean) => void;
  createClass: (input: NewClassInput) => string;
  addAssignment: (input: Pick<Assignment, 'classId' | 'title' | 'weight'>) => string;
  updateAssignment: (id: string, patch: Partial<Pick<Assignment, 'title' | 'weight'>>) => void;
  deleteAssignment: (id: string) => void;
  /** Writes several scores as one audited change. `reason` is required by the UI when an existing score changes. */
  setGrades: (changes: { assignmentId: string; nim: string; score: number | null }[], reason?: string) => void;
  enroll: (classId: string, nims: string[]) => number;
  unenroll: (classId: string, nim: string) => void;
  transferStudent: (input: TransferStudentInput) => number;
  bulkInsertLabs: (input: BulkLabsInput) => number;
  bulkInsertStudents: (input: BulkStudentsInput) => number;
  bulkInsertAssistants: (input: BulkAssistantsInput) => number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export interface ActionContext {
  /** NIM of the signed-in user performing the action. */
  nim: string;
  /** Unique id generator (server: time + random). */
  id: (prefix: string) => string;
  /** Random secret for QR signing. */
  secret: () => string;
}

export function createActions(ctx: ActionContext) {
  const nimRef = { current: ctx.nim as string | null };
  const uid = ctx.id;
  let cur: DemoState | null = null;
  /** Binds the draft for the helpers below, then runs the action body. */
  const run =
    <T,>(fn: (draft: DemoState) => T) =>
    (draft: DemoState): T => {
      cur = draft;
      return fn(draft);
    };
  const actor = () => cur?.users.find((u) => u.nim === nimRef.current);
  const notify = (draft: DemoState, recipients: string[], type: NotificationType, title: string, body: string, href?: string) => {
    const created: AppNotification[] = recipients.map((recipient) => ({
      id: uid('n'),
      nim: recipient,
      type,
      title,
      body,
      href,
      createdAt: Date.now(),
    }));
    draft.notifications = [...created, ...draft.notifications];
    return created.length;
  };
  const nameOf = (draft: DemoState, nim: string) => draft.users.find((u) => u.nim === nim)?.name ?? nim;
  /** Appends to the audit log as the signed-in user. */
  const record = (draft: DemoState, entry: Omit<AuditDraft, 'actor' | 'actorRole'>) => {
    const who = draft.users.find((u) => u.nim === nimRef.current);
    if (!who) return;
    draft.log = appendLog(draft.log, { ...entry, actor: who.nim, actorRole: who.role });
  };
  const sessionTarget = (draft: DemoState, session: Session) => {
    const v = viewSession(draft, session);
    return `${v.course.name} ${v.cls.label} · Pertemuan ${session.meetingNo}`;
  };
  const DECISION = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' } as const;
  /** Copies a finished, fully graded quiz attempt into the linked grade book column. */
  const syncQuizGrade = (draft: DemoState, quiz: Quiz, attempt: QuizAttempt) => {
    if (!quiz.assignmentId || attempt.status === 'MENGERJAKAN') return;
    const sc = quizScore(quiz, attempt);
    if (sc.pending === 0) draft.grades[gradeKey(quiz.assignmentId, attempt.nim)] = sc.pct;
  };

  const actions: { [K in keyof ActionSignatures]: (...args: Parameters<ActionSignatures[K]>) => (draft: DemoState) => ReturnType<ActionSignatures[K]> } = {
      checkIn: ({ sessionId, method, position, qrToken }) =>
        run((draft) => {
          const user = actor();
          const session = draft.sessions.find((s) => s.id === sessionId);
          if (!user || !session) return { ok: false, failure: 'SESSION_NOT_OPEN' } as CheckInVerdict;
          const cls = draft.classes.find((c) => c.id === session.classId)!;
          const lab = draft.labs.find((l) => l.id === session.labId)!;
          const verdict = evaluateCheckIn({
            session,
            lab,
            nim: user.nim,
            enrolled: cls.studentNims.includes(user.nim),
            alreadyCheckedIn: !!attendanceFor(draft, sessionId, user.nim),
            serverNow: Date.now(),
            method,
            position,
            qrToken,
            qrSecret: draft.qrSecrets[sessionId],
          });
          draft.attempts = [
            {
              id: uid('att'),
              sessionId,
              nim: user.nim,
              at: Date.now(),
              ok: verdict.ok,
              method,
              failure: verdict.ok ? undefined : verdict.failure,
              distanceM: verdict.distanceM,
              accuracyM: verdict.accuracyM,
            },
            ...draft.attempts,
          ];
          if (verdict.ok) {
            const attendanceRecord = {
              id: `${sessionId}__${user.nim}`,
              sessionId,
              nim: user.nim,
              status: verdict.status,
              method,
              checkedInAt: Date.now(),
              distanceM: verdict.distanceM ? Math.round(verdict.distanceM) : undefined,
              accuracyM: verdict.accuracyM ? Math.round(verdict.accuracyM) : undefined,
            };
            draft.attendance = [...draft.attendance, attendanceRecord];
            onAttendanceRecorded(draft, attendanceRecord, session, lab, notify);
          }
          return verdict;
        }),

      openSession: (sessionId) =>
        run((draft) => {
          const session = draft.sessions.find((s) => s.id === sessionId);
          if (!session || session.status !== 'TERJADWAL') return 0;
          session.status = 'DIBUKA';
          session.openedAt = Date.now();
          // Fresh QR signing secret for this session (staff-only, see sessionSecrets).
          draft.qrSecrets = { ...draft.qrSecrets, [session.id]: ctx.secret() };
          record(draft, { kind: 'PERTEMUAN', classId: session.classId, target: sessionTarget(draft, session), summary: 'Membuka sesi presensi', changes: [{ label: 'Status', from: 'Terjadwal', to: 'Dibuka' }] });
          const view = viewSession(draft, session);
          return notify(draft, view.cls.studentNims, 'SESSION_OPENED', `Sesi dibuka · ${view.course.name}`,
            `${view.subtitle} di ${view.lab.name}. Presensi sekarang.`, `/presensi/${session.id}`);
        }),

      closeSession: (sessionId) =>
        run((draft) => {
          const session = draft.sessions.find((s) => s.id === sessionId);
          if (!session || session.status !== 'DIBUKA') return;
          session.status = 'SELESAI';
          session.closedAt = Date.now();
          const cls = draft.classes.find((c) => c.id === session.classId)!;
          const missing = cls.studentNims.filter((n) => !attendanceFor(draft, sessionId, n));
          record(draft, { kind: 'PERTEMUAN', classId: session.classId, target: sessionTarget(draft, session), summary: 'Menutup sesi presensi',
            changes: [{ label: 'Status', from: 'Dibuka', to: 'Selesai' }, ...(missing.length ? [{ label: 'Tanpa presensi', to: `${missing.length} praktikan jadi alpha/izin` }] : [])] });
          for (const student of cls.studentNims) {
            if (attendanceFor(draft, sessionId, student)) continue;
            const approved = leaveFor(draft, sessionId, student)?.decision === 'approved';
            draft.attendance.push({
              id: `${sessionId}__${student}`,
              sessionId,
              nim: student,
              status: approved ? 'IZIN' : 'ALPHA',
              method: 'MANUAL',
              checkedInAt: Date.now(),
              note: approved ? 'Izin disetujui' : 'Tidak presensi sampai sesi ditutup',
            });
          }
        }),

      updateSession: (sessionId, patch, changeNote) =>
        run((draft) => {
          const session = draft.sessions.find((s) => s.id === sessionId);
          if (!session) return 0;
          const scheduleChanged =
            (patch.startsAt !== undefined && patch.startsAt !== session.startsAt) ||
            (patch.endsAt !== undefined && patch.endsAt !== session.endsAt) ||
            (patch.labId !== undefined && patch.labId !== session.labId) ||
            patch.status === 'DIBATALKAN';
          const labName = (id: string) => draft.labs.find((l) => l.id === id)?.name ?? id;
          const diff: { label: string; from?: string; to: string }[] = [];
          if (patch.topic !== undefined && patch.topic !== session.topic) diff.push({ label: 'Topik', from: session.topic, to: patch.topic });
          if (patch.description !== undefined && patch.description !== session.description) diff.push({ label: 'Keterangan', to: 'diubah' });
          if ((patch.startsAt ?? session.startsAt) !== session.startsAt || (patch.endsAt ?? session.endsAt) !== session.endsAt)
            diff.push({ label: 'Waktu', from: `${formatDate(session.startsAt, { weekday: true })} ${formatTimeRange(session.startsAt, session.endsAt)}`,
              to: `${formatDate(patch.startsAt ?? session.startsAt, { weekday: true })} ${formatTimeRange(patch.startsAt ?? session.startsAt, patch.endsAt ?? session.endsAt)}` });
          if (patch.labId !== undefined && patch.labId !== session.labId) diff.push({ label: 'Lab', from: labName(session.labId), to: labName(patch.labId) });
          if (patch.lateAfterMin !== undefined && patch.lateAfterMin !== session.lateAfterMin) diff.push({ label: 'Terlambat setelah', from: `${session.lateAfterMin} mnt`, to: `${patch.lateAfterMin} mnt` });
          if (patch.materials !== undefined && JSON.stringify(patch.materials) !== JSON.stringify(session.materials)) diff.push({ label: 'Materi', from: `${session.materials.length} tautan`, to: `${patch.materials.length} tautan` });
          if (patch.status !== undefined && patch.status !== session.status) diff.push({ label: 'Status', from: session.status, to: patch.status });
          if (diff.length) {
            record(draft, { kind: 'PERTEMUAN', classId: session.classId, target: sessionTarget(draft, session),
              summary: patch.status === 'DIBATALKAN' ? 'Membatalkan pertemuan' : 'Mengubah pertemuan', changes: diff, reason: changeNote || undefined });
          }
          Object.assign(session, patch);
          if (!scheduleChanged) return 0;
          session.changeNote = changeNote || 'Jadwal diperbarui oleh asisten.';
          const view = viewSession(draft, session);
          const when = `${formatDate(session.startsAt, { weekday: true })}, ${formatTimeRange(session.startsAt, session.endsAt)}`;
          const body = session.status === 'DIBATALKAN'
            ? `Pertemuan ${session.meetingNo} dibatalkan. ${session.changeNote}`
            : `Pertemuan ${session.meetingNo} jadi ${when} di ${view.lab.name}. ${session.changeNote}`;
          return notify(draft, view.cls.studentNims, 'SCHEDULE_CHANGED', `Jadwal berubah · ${view.course.name}`, body, `/sesi/${session.id}`);
        }),

      createSessions: ({ classId, topic, description, startsAt, durationMin, labId, repeatWeeks, materials }) =>
        run((draft) => {
          const existing = draft.sessions.filter((s) => s.classId === classId);
          const startNo = existing.reduce((max, s) => Math.max(max, s.meetingNo), 0) + 1;
          const count = Math.max(1, repeatWeeks);
          const ids: string[] = [];
          for (let i = 0; i < count; i++) {
            const start = startsAt + i * 7 * 24 * HOUR;
            const id = uid(`${classId}-p${startNo + i}`);
            ids.push(id);
            draft.sessions.push({
              id,
              classId,
              meetingNo: startNo + i,
              topic: count > 1 ? `${topic} ${i + 1}` : topic,
              description,
              labId,
              startsAt: start,
              endsAt: start + durationMin * MINUTE,
              status: 'TERJADWAL',
              lateAfterMin: 15,
              materials: materials ?? [],
            });
          }
          const cls = draft.classes.find((c) => c.id === classId);
          const course = draft.courses.find((c) => c.id === cls?.courseId);
          record(draft, { kind: 'PERTEMUAN', classId, target: `${course?.name ?? ''} ${cls?.label ?? ''}`.trim(),
            summary: count > 1 ? `Menambah ${count} pertemuan` : `Menambah pertemuan ${startNo}`, changes: [{ label: 'Topik', to: topic }, { label: 'Mulai', to: formatDate(startsAt, { weekday: true }) }] });
          return ids;
        }),

      submitLeave: ({ sessionId, reason, attachmentName }) =>
        run((draft) => {
          const user = actor()!;
          const id = `${sessionId}__${user.nim}`;
          draft.leaves = [
            {
              id,
              sessionId,
              nim: user.nim,
              reason,
              attachmentName,
              // Demo stand-in for POST /api/leave-requests/{id}/classify (same keyword fallback the server uses).
              category: classifyByKeywords(reason).category as LeaveCategory,
              submittedAt: Date.now(),
              decision: 'pending',
            },
            ...draft.leaves.filter((l) => l.id !== id),
          ];
          const view = viewSession(draft, draft.sessions.find((s) => s.id === sessionId)!);
          notify(draft, view.cls.assistantNims, 'LEAVE_SUBMITTED', `Izin baru · ${view.course.name}`,
            `${user.name} mengajukan izin untuk pertemuan ${view.meetingNo}.`, `/izin/${id}`);
          return id;
        }),

      reviewLeave: (leaveId, decision, note) =>
        run((draft) => {
          const leave = draft.leaves.find((l) => l.id === leaveId);
          const reviewer = actor();
          if (!leave || !reviewer) return;
          const leaveSession = draft.sessions.find((s) => s.id === leave.sessionId)!;
          record(draft, { kind: 'IZIN', classId: leaveSession.classId, target: `${nameOf(draft, leave.nim)} · Pertemuan ${leaveSession.meetingNo}`,
            summary: leave.decision === 'pending' ? (decision === 'approved' ? 'Menyetujui izin' : 'Menolak izin') : 'Mengubah keputusan izin',
            changes: [{ label: 'Keputusan', from: DECISION[leave.decision], to: DECISION[decision] }], reason: note || undefined });
          leave.decision = decision;
          leave.reviewedBy = reviewer.nim;
          leave.reviewedAt = Date.now();
          leave.reviewNote = note;
          const session = draft.sessions.find((s) => s.id === leave.sessionId)!;
          const view = viewSession(draft, session);
          if (session.status === 'SELESAI') {
            const record = draft.attendance.find((a) => a.id === leaveId);
            if (decision === 'approved' && record?.status === 'ALPHA') record.status = 'IZIN';
            // Decision changed to rejected after the fact: no check-in, so the closed session counts as alpha again.
            if (decision === 'rejected' && record?.status === 'IZIN' && record.method === 'MANUAL') record.status = 'ALPHA';
          }
          if (decision === 'approved') onLeaveApproved(draft, leave, session);
          notify(draft, [leave.nim], decision === 'approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
            `Izin ${decision === 'approved' ? 'disetujui' : 'ditolak'} · ${view.course.name}`,
            `Pertemuan ${view.meetingNo}${note ? `: "${note}"` : ''} oleh ${reviewer.name}.`, `/izin/${leaveId}`);
        }),

      overrideAttendance: (sessionId, student, status, note) =>
        run((draft) => {
          const id = `${sessionId}__${student}`;
          const before = draft.attendance.find((a) => a.id === id)?.status;
          const session = draft.sessions.find((s) => s.id === sessionId);
          if (session && before !== (status ?? undefined)) {
            record(draft, { kind: 'PRESENSI', classId: session.classId, target: `${nameOf(draft, student)} · Pertemuan ${session.meetingNo}`,
              summary: status ? 'Mengubah status presensi' : 'Menghapus presensi', changes: [{ label: 'Status', from: before ?? 'Belum presensi', to: status ?? 'Belum presensi' }], reason: note || undefined });
          }
          draft.attendance = draft.attendance.filter((a) => a.id !== id);
          if (status) {
            draft.attendance.push({
              id,
              sessionId,
              nim: student,
              status,
              method: 'MANUAL',
              checkedInAt: Date.now(),
              note,
              overriddenBy: nimRef.current ?? undefined,
            });
          }
        }),

      saveLab: (lab) =>
        run((draft) => {
          const next = { ...lab, updatedAt: Date.now(), updatedBy: nimRef.current ?? undefined };
          const prev = draft.labs.find((l) => l.id === lab.id);
          const exists = !!prev;
          const diff = prev ? labDiff(prev, lab) : [];
          if (!prev || diff.length) {
            record(draft, { kind: 'LAB', target: lab.name, summary: prev ? 'Mengubah lab' : 'Menambah lab', changes: prev ? diff : [{ label: 'Titik', to: `${lab.lat.toFixed(5)}, ${lab.lng.toFixed(5)}` }] });
          }
          draft.labs = exists ? draft.labs.map((l) => (l.id === lab.id ? next : l)) : [...draft.labs, next];
        }),

      deleteLab: (labId) =>
        run((draft) => {
          const lab = draft.labs.find((l) => l.id === labId);
          if (lab) record(draft, { kind: 'LAB', target: lab.name, summary: 'Menghapus lab' });
          draft.labs = draft.labs.filter((l) => l.id !== labId);
        }),

      setRole: (target, role) =>
        run((draft) => {
          const user = draft.users.find((u) => u.nim === target);
          if (!user) return;
          if (user.role !== role) record(draft, { kind: 'PERAN', target: user.name, summary: 'Mengubah peran', changes: [{ label: 'Peran', from: user.role, to: role }] });
          user.role = role;
          notify(draft, [target], 'SYSTEM', 'Peran akun diperbarui', `Akunmu sekarang berperan sebagai ${role.toLowerCase()}.`);
        }),

      addUser: (user) =>
        run((draft) => {
          record(draft, { kind: 'PERAN', target: user.name, summary: 'Menambah pengguna', changes: [{ label: 'Peran', to: user.role }, { label: 'NIM/NIP', to: user.nim }] });
          draft.users = [...draft.users.filter((u) => u.nim !== user.nim), user];
        }),

      setClassAssistant: (classId, target, assigned) =>
        run((draft) => {
          const cls = draft.classes.find((c) => c.id === classId);
          if (!cls) return;
          if (assigned !== cls.assistantNims.includes(target)) {
            const course = draft.courses.find((c) => c.id === cls.courseId);
            record(draft, { kind: 'ANGGOTA', classId, target: `${course?.name ?? ''} ${cls.label}`, summary: assigned ? 'Menugaskan asisten' : 'Melepas asisten',
              changes: [{ label: 'Asisten', to: `${nameOf(draft, target)} ${assigned ? 'ditambahkan' : 'dilepas'}` }] });
          }
          cls.assistantNims = assigned
            ? Array.from(new Set([...cls.assistantNims, target]))
            : cls.assistantNims.filter((n) => n !== target);
        }),

      createClass: (input) =>
        run((draft) => {
          let courseId = input.courseId ?? '';
          if (input.newCourse) {
            courseId = uid('course');
            draft.courses.push({
              id: courseId,
              code: input.newCourse.code || '-',
              name: input.newCourse.name,
              semester: draft.courses[0]?.semester ?? '',
            });
          }
          const [h, m] = input.startTime.split(':').map(Number);
          const first = input.firstDay + (h * 60 + m) * MINUTE;
          const end = new Date(first + input.durationMin * MINUTE);
          const id = uid(`${courseId}-kelas`);
          draft.classes.push({
            id,
            courseId,
            label: input.label,
            labId: input.labId,
            assistantNims: [...input.assistantNims],
            studentNims: [...input.studentNims],
            weekday: new Date(first).getDay(),
            startTime: input.startTime,
            endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
          });
          for (let i = 0; i < input.meetings; i++) {
            const start = first + i * 7 * 24 * HOUR;
            draft.sessions.push({
              id: `${id}-p${i + 1}`,
              classId: id,
              meetingNo: i + 1,
              topic: `Pertemuan ${i + 1}`,
              description: 'Topik dan keterangan diisi asisten.',
              labId: input.labId,
              startsAt: start,
              endsAt: start + input.durationMin * MINUTE,
              status: 'TERJADWAL',
              lateAfterMin: 15,
              materials: [],
            });
          }
          const course = draft.courses.find((c) => c.id === courseId);
          record(draft, { kind: 'KELAS', classId: id, target: `${course?.name ?? ''} · ${input.label}`, summary: `Membuat kelas dengan ${input.meetings} pertemuan`,
            changes: [{ label: 'Asisten', to: input.assistantNims.map((n) => nameOf(draft, n)).join(', ') || '–' }, { label: 'Praktikan', to: `${input.studentNims.length} orang` }] });
          notify(draft, input.assistantNims, 'SYSTEM', `Kamu asisten ${course?.name ?? 'kelas baru'}`,
            `${input.label} · ${input.meetings} pertemuan, mulai ${formatDate(first, { weekday: true })}.`, `/kelas/${id}`);
          return id;
        }),

      addAssignment: ({ classId, title, weight }) =>
        run((draft) => {
          const id = uid(`${classId}-t`);
          draft.assignments.push({ id, classId, title, weight, maxScore: 100, createdAt: Date.now() });
          record(draft, { kind: 'NILAI', classId, target: title, summary: 'Menambah komponen nilai', changes: [{ label: 'Bobot', to: `${weight}%` }] });
          return id;
        }),

      updateAssignment: (id, patch) =>
        run((draft) => {
          const a = draft.assignments.find((x) => x.id === id);
          if (!a) return;
          const diff: { label: string; from?: string; to: string }[] = [];
          if (patch.title !== undefined && patch.title !== a.title) diff.push({ label: 'Judul', from: a.title, to: patch.title });
          if (patch.weight !== undefined && patch.weight !== a.weight) diff.push({ label: 'Bobot', from: `${a.weight}%`, to: `${patch.weight}%` });
          if (diff.length) record(draft, { kind: 'NILAI', classId: a.classId, target: a.title, summary: 'Mengubah komponen nilai', changes: diff });
          Object.assign(a, patch);
        }),

      deleteAssignment: (id) =>
        run((draft) => {
          const a = draft.assignments.find((x) => x.id === id);
          if (a) {
            const filled = Object.keys(draft.grades).filter((k) => k.startsWith(`${id}__`)).length;
            record(draft, { kind: 'NILAI', classId: a.classId, target: a.title, summary: 'Menghapus komponen nilai', changes: [{ label: 'Nilai terhapus', to: `${filled} nilai` }] });
          }
          draft.assignments = draft.assignments.filter((a) => a.id !== id);
          for (const key of Object.keys(draft.grades)) if (key.startsWith(`${id}__`)) delete draft.grades[key];
        }),

      setGrades: (changes, reason) =>
        run((draft) => {
          const diff: { label: string; from?: string; to: string }[] = [];
          let classId: string | undefined;
          const titles = new Set<string>();
          for (const { assignmentId, nim: student, score } of changes) {
            const key = gradeKey(assignmentId, student);
            const a = draft.assignments.find((x) => x.id === assignmentId);
            classId = a?.classId ?? classId;
            if (a) titles.add(a.title);
            const before = draft.grades[key];
            const after = score === null ? undefined : Math.max(0, Math.min(100, Math.round(score)));
            if (before === after) continue;
            diff.push({ label: `${nameOf(draft, student)} · ${a?.title ?? ''}`, from: before === undefined ? 'kosong' : String(before), to: after === undefined ? 'dikosongkan' : String(after) });
            if (after === undefined) delete draft.grades[key];
            else draft.grades[key] = after;
          }
          if (!diff.length) return;
          record(draft, { kind: 'NILAI', classId, target: diff.length === 1 ? diff[0].label : [...titles].join(', '),
            summary: diff.every((d) => d.from === 'kosong') ? `Mengisi ${diff.length} nilai` : `Mengubah ${diff.length} nilai`, changes: diff, reason: reason || undefined });
        }),

      enroll: (classId, nims) =>
        run((draft) => {
          const cls = draft.classes.find((c) => c.id === classId);
          if (!cls) return 0;
          const before = cls.studentNims.length;
          for (const raw of nims) {
            const n = raw.trim();
            if (!n) continue;
            if (!draft.users.some((u) => u.nim === n)) {
              draft.users.push({ nim: n, name: `Mahasiswa ${n.slice(-4)}`, email: `${n}@students.labsync.id`, role: 'PRAKTIKAN' });
            }
            if (!cls.studentNims.includes(n)) cls.studentNims.push(n);
          }
          const added = cls.studentNims.slice(before);
          if (added.length) {
            const course = draft.courses.find((c) => c.id === cls.courseId);
            record(draft, { kind: 'ANGGOTA', classId, target: `${course?.name ?? ''} ${cls.label}`, summary: `Menambah ${added.length} praktikan`,
              changes: added.map((n) => ({ label: 'Praktikan', to: nameOf(draft, n) })) });
          }
          return cls.studentNims.length - before;
        }),

      unenroll: (classId, target) =>
        run((draft) => {
          const cls = draft.classes.find((c) => c.id === classId);
          if (!cls || !cls.studentNims.includes(target)) return;
          const course = draft.courses.find((c) => c.id === cls.courseId);
          record(draft, { kind: 'ANGGOTA', classId, target: `${course?.name ?? ''} ${cls.label}`, summary: 'Mengeluarkan praktikan', changes: [{ label: 'Praktikan', to: `${nameOf(draft, target)} dikeluarkan` }] });
          cls.studentNims = cls.studentNims.filter((n) => n !== target);
        }),

      transferStudent: (input) => run((draft) => transferStudent(draft, input)),
      bulkInsertLabs: (input) => run((draft) => bulkInsertLabs(draft, input)),
      bulkInsertStudents: (input) => run((draft) => bulkInsertStudents(draft, input)),
      bulkInsertAssistants: (input) => run((draft) => bulkInsertAssistants(draft, input)),

      setClassLinks: (classId, links) =>
        run((draft) => {
          const cls = draft.classes.find((c) => c.id === classId);
          if (!cls) return;
          const before = cls.links ?? [];
          if (JSON.stringify(before) === JSON.stringify(links)) return;
          const course = draft.courses.find((c) => c.id === cls.courseId);
          const added = links.filter((l) => !before.some((b) => b.url === l.url));
          const removed = before.filter((b) => !links.some((l) => l.url === b.url));
          record(draft, { kind: 'KELAS', classId, target: `${course?.name ?? ''} ${cls.label}`, summary: 'Mengubah tautan kelas',
            changes: [
              ...added.map((l) => ({ label: 'Ditambah', to: l.label })),
              ...removed.map((l) => ({ label: 'Dihapus', to: l.label })),
              ...(added.length || removed.length ? [] : [{ label: 'Tautan', to: 'urutan/nama diubah' }]),
            ] });
          cls.links = links;
        }),

      setNavSlots: (slots) =>
        run((draft) => {
          const me = nimRef.current;
          if (!me) return;
          const next = { ...draft.navPrefs };
          if (slots) next[me] = slots;
          else delete next[me];
          draft.navPrefs = next;
        }),

      saveQuiz: (input) =>
        run((draft) => {
          const session = draft.sessions.find((s) => s.id === input.sessionId)!;
          const existing = input.id ? draft.quizzes.find((q) => q.id === input.id) : undefined;
          const quiz: Quiz = existing ?? {
            id: uid(`kuis-${session.id}`),
            sessionId: session.id,
            classId: session.classId,
            title: '',
            durationMin: 15,
            maxWarnings: 3,
            shuffle: true,
            requireAttendance: true,
            questions: [],
            status: 'DRAFT',
            createdBy: nimRef.current ?? '',
            createdAt: Date.now(),
          };
          Object.assign(quiz, {
            title: input.title,
            durationMin: input.durationMin,
            maxWarnings: input.maxWarnings,
            shuffle: input.shuffle,
            requireAttendance: input.requireAttendance,
            questions: input.questions,
          });
          // Grade book link: a column "Kuis P{n}" that receives the final quiz score.
          const linked = quiz.assignmentId ? draft.assignments.find((a) => a.id === quiz.assignmentId) : undefined;
          if (input.gradeWeight !== null) {
            if (linked) linked.weight = input.gradeWeight;
            else {
              const aid = uid(`${session.classId}-kuis`);
              draft.assignments.push({ id: aid, classId: session.classId, title: `Kuis P${session.meetingNo}`, weight: input.gradeWeight, maxScore: 100, createdAt: Date.now() });
              quiz.assignmentId = aid;
            }
          } else if (linked) {
            draft.assignments = draft.assignments.filter((a) => a.id !== linked.id);
            quiz.assignmentId = undefined;
          }
          if (!existing) draft.quizzes = [...draft.quizzes, quiz];
          record(draft, { kind: 'KUIS', classId: session.classId, target: quiz.title, summary: existing ? 'Mengubah kuis' : `Membuat kuis ${quiz.questions.length} soal`,
            changes: [{ label: 'Soal', to: `${quiz.questions.length} soal · ${quiz.durationMin} menit` },
              { label: 'Masuk penilaian', to: input.gradeWeight === null ? 'Tidak' : `Kuis P${session.meetingNo} · ${input.gradeWeight}%` }] });
          return quiz.id;
        }),

      deleteQuiz: (quizId) =>
        run((draft) => {
          const quiz = draft.quizzes.find((q) => q.id === quizId);
          if (!quiz || quiz.status !== 'DRAFT') return;
          record(draft, { kind: 'KUIS', classId: quiz.classId, target: quiz.title, summary: 'Menghapus draft kuis' });
          if (quiz.assignmentId) draft.assignments = draft.assignments.filter((a) => a.id !== quiz.assignmentId);
          draft.quizzes = draft.quizzes.filter((q) => q.id !== quizId);
        }),

      setQuizStatus: (quizId, status) =>
        run((draft) => {
          const quiz = draft.quizzes.find((q) => q.id === quizId);
          if (!quiz || quiz.status === status) return;
          const label = { DRAFT: 'Draft', DIBUKA: 'Dibuka', DITUTUP: 'Ditutup' } as const;
          record(draft, { kind: 'KUIS', classId: quiz.classId, target: quiz.title, summary: status === 'DIBUKA' ? 'Membuka kuis' : 'Menutup kuis',
            changes: [{ label: 'Status', from: label[quiz.status], to: label[status] }] });
          quiz.status = status;
          if (status === 'DIBUKA') {
            quiz.openedAt = Date.now();
            const cls = draft.classes.find((c) => c.id === quiz.classId)!;
            const course = draft.courses.find((c) => c.id === cls.courseId);
            notify(draft, cls.studentNims, 'SYSTEM', `Kuis dibuka · ${course?.name ?? ''}`, `${quiz.title}: ${quiz.questions.length} soal, ${quiz.durationMin} menit.`, `/kuis/${quiz.id}`);
          } else {
            quiz.closedAt = Date.now();
            // Anyone still working is submitted with what they have.
            for (const a of draft.quizAttempts) {
              if (a.quizId !== quiz.id || a.status !== 'MENGERJAKAN') continue;
              a.status = 'DIKUMPULKAN';
              a.submittedAt = Date.now();
              syncQuizGrade(draft, quiz, a);
            }
          }
        }),

      startQuiz: (quizId) =>
        run((draft) => {
          const me = nimRef.current!;
          const quiz = draft.quizzes.find((q) => q.id === quizId);
          if (!quiz || quiz.status !== 'DIBUKA') return { ok: false as const, reason: 'TUTUP' as const };
          const existing = attemptFor(draft, quizId, me);
          if (existing) return existing.status === 'MENGERJAKAN' ? { ok: true as const } : { ok: false as const, reason: 'SELESAI' as const };
          const att = attendanceFor(draft, quiz.sessionId, me);
          if (quiz.requireAttendance && !(att && (att.status === 'HADIR' || att.status === 'TERLAMBAT'))) return { ok: false as const, reason: 'BELUM_PRESENSI' as const };
          const order = quiz.questions.map((q) => q.id);
          if (quiz.shuffle) {
            for (let i = order.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [order[i], order[j]] = [order[j], order[i]];
            }
          }
          const now = Date.now();
          draft.quizAttempts = [...draft.quizAttempts, {
            id: `${quizId}__${me}`, quizId, nim: me, startedAt: now, deadline: now + quiz.durationMin * MINUTE,
            order, answers: {}, violations: [], allowance: 0, status: 'MENGERJAKAN', manual: {},
          }];
          return { ok: true as const };
        }),

      answerQuiz: (quizId, questionId, value) =>
        run((draft) => {
          const a = attemptFor(draft, quizId, nimRef.current ?? '');
          if (a?.status === 'MENGERJAKAN') a.answers = { ...a.answers, [questionId]: value };
        }),

      reportViolation: (quizId, kind) =>
        run((draft) => {
          const quiz = draft.quizzes.find((q) => q.id === quizId);
          const a = attemptFor(draft, quizId, nimRef.current ?? '');
          if (!quiz || !a || a.status !== 'MENGERJAKAN') return { left: 0, kicked: false };
          a.violations = [...a.violations, { at: Date.now(), kind }];
          const left = quiz.maxWarnings + a.allowance - a.violations.length;
          if (left < 0) {
            a.status = 'DIKELUARKAN';
            a.submittedAt = Date.now();
            syncQuizGrade(draft, quiz, a);
            const cls = draft.classes.find((c) => c.id === quiz.classId)!;
            notify(draft, cls.assistantNims, 'SYSTEM', `Dikeluarkan dari kuis · ${quiz.title}`,
              `${nameOf(draft, a.nim)} melanggar ${a.violations.length}x, jawaban dikumpulkan otomatis.`, `/kuis/${quiz.id}`);
            return { left: 0, kicked: true };
          }
          return { left, kicked: false };
        }),

      submitQuiz: (quizId) =>
        run((draft) => {
          const quiz = draft.quizzes.find((q) => q.id === quizId);
          const a = attemptFor(draft, quizId, nimRef.current ?? '');
          if (!quiz || !a || a.status !== 'MENGERJAKAN') return;
          a.status = 'DIKUMPULKAN';
          a.submittedAt = Date.now();
          syncQuizGrade(draft, quiz, a);
        }),

      allowReentry: (attemptId, reason) =>
        run((draft) => {
          const a = draft.quizAttempts.find((x) => x.id === attemptId);
          const quiz = draft.quizzes.find((q) => q.id === a?.quizId);
          if (!a || !quiz || a.status !== 'DIKELUARKAN' || quiz.status !== 'DIBUKA') return;
          record(draft, { kind: 'KUIS', classId: quiz.classId, target: `${nameOf(draft, a.nim)} · ${quiz.title}`, summary: 'Mengizinkan masuk lagi',
            changes: [{ label: 'Status', from: 'Dikeluarkan', to: 'Mengerjakan' }, { label: 'Kesempatan', to: '+1 peringatan' }], reason });
          a.status = 'MENGERJAKAN';
          a.allowance += 1;
          a.submittedAt = undefined;
          a.deadline = Math.max(a.deadline, Date.now() + 5 * MINUTE);
          if (quiz.assignmentId) delete draft.grades[gradeKey(quiz.assignmentId, a.nim)];
          notify(draft, [a.nim], 'SYSTEM', `Boleh lanjut kuis · ${quiz.title}`, 'Asisten mengizinkanmu masuk lagi. Jangan keluar dari aplikasi.', `/kuis/${quiz.id}`);
        }),

      gradeAnswer: (attemptId, questionId, score) =>
        run((draft) => {
          const a = draft.quizAttempts.find((x) => x.id === attemptId);
          const quiz = draft.quizzes.find((q) => q.id === a?.quizId);
          const q = quiz?.questions.find((x) => x.id === questionId);
          if (!a || !quiz || !q) return;
          const next = Math.max(0, Math.min(q.points, Math.round(score)));
          const before = a.manual[questionId];
          if (before === next) return;
          record(draft, { kind: 'KUIS', classId: quiz.classId, target: `${nameOf(draft, a.nim)} · ${quiz.title}`, summary: 'Menilai jawaban isian',
            changes: [{ label: `Soal ${quiz.questions.indexOf(q) + 1}`, from: before === undefined ? 'belum dinilai' : `${before}/${q.points}`, to: `${next}/${q.points}` }] });
          a.manual = { ...a.manual, [questionId]: next };
          syncQuizGrade(draft, quiz, a);
        }),

      markRead: (id) =>
        run((draft) => {
          const n = draft.notifications.find((x) => x.id === id);
          if (n && !n.readAt) n.readAt = Date.now();
        }),

      markAllRead: () =>
        run((draft) => {
          draft.notifications.forEach((n) => {
            if (n.nim === nimRef.current && !n.readAt) n.readAt = Date.now();
          });
        }),
  };
  return actions;
}

export type ActionName = keyof ActionSignatures;
