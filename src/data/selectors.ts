import type { DemoState } from './demo-seed';
import type { Assignment, Attendance, AttendanceStatus, ClassGroup, Course, Lab, LeaveRequest, Session, User } from './types';

export interface SessionView extends Session {
  course: Course;
  cls: ClassGroup;
  lab: Lab;
  /** "Pemrograman Aplikasi Bergerak · Kelas E" */
  title: string;
  /** "Pertemuan 8 · Lokasi, Geofence & Maps" */
  subtitle: string;
  assistants: User[];
}

export function viewSession(state: DemoState, session: Session): SessionView {
  const cls = state.classes.find((c) => c.id === session.classId)!;
  const course = state.courses.find((c) => c.id === cls.courseId)!;
  const lab = state.labs.find((l) => l.id === session.labId) ?? state.labs[0];
  return {
    ...session,
    cls,
    course,
    lab,
    title: `${course.name} · ${cls.label}`,
    subtitle: `Pertemuan ${session.meetingNo} · ${session.topic}`,
    assistants: cls.assistantNims.map((nim) => state.users.find((u) => u.nim === nim)).filter(Boolean) as User[],
  };
}

export function classesForUser(state: DemoState, user: User) {
  if (user.role === 'ASLAB') return state.classes;
  if (user.role === 'ASPRAK') return state.classes.filter((c) => c.assistantNims.includes(user.nim));
  return state.classes.filter((c) => c.studentNims.includes(user.nim));
}

export function sessionsForUser(state: DemoState, user: User) {
  const ids = new Set(classesForUser(state, user).map((c) => c.id));
  return state.sessions
    .filter((s) => ids.has(s.classId))
    .sort((a, b) => a.startsAt - b.startsAt)
    .map((s) => viewSession(state, s));
}

/** Live session first, then the next one that has not ended. */
export function focusSessions(sessions: SessionView[], now: number) {
  const live = sessions.filter((s) => s.status === 'DIBUKA');
  const upcoming = sessions.filter((s) => s.status === 'TERJADWAL' && s.endsAt > now);
  return { live, upcoming, next: upcoming[0] };
}

export function attendanceFor(state: DemoState, sessionId: string, nim: string) {
  return state.attendance.find((a) => a.sessionId === sessionId && a.nim === nim);
}

export function leaveFor(state: DemoState, sessionId: string, nim: string) {
  return state.leaves.find((l) => l.sessionId === sessionId && l.nim === nim);
}

export function userByNim(state: DemoState, nim: string) {
  return state.users.find((u) => u.nim === nim);
}

export interface Tally {
  HADIR: number;
  TERLAMBAT: number;
  IZIN: number;
  ALPHA: number;
  total: number;
  /** Present or late, as a percentage of finished meetings. */
  rate: number;
}

export function tally(records: Pick<Attendance, 'status'>[], expected = records.length): Tally {
  const t = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, ALPHA: 0 } as Record<AttendanceStatus, number>;
  records.forEach((r) => (t[r.status] += 1));
  const total = Math.max(expected, records.length);
  return { ...t, total, rate: total ? Math.round(((t.HADIR + t.TERLAMBAT) / total) * 100) : 100 };
}

export interface CourseStat {
  cls: ClassGroup;
  course: Course;
  finished: number;
  tally: Tally;
}

export function studentStats(state: DemoState, nim: string): { overall: Tally; perClass: CourseStat[] } {
  const classes = state.classes.filter((c) => c.studentNims.includes(nim));
  const perClass = classes.map((cls) => {
    const finished = state.sessions.filter((s) => s.classId === cls.id && s.status === 'SELESAI');
    const records = finished
      .map((s) => attendanceFor(state, s.id, nim) ?? ({ status: 'ALPHA' } as const))
      .map((r) => ({ status: r.status }));
    return { cls, course: state.courses.find((c) => c.id === cls.courseId)!, finished: finished.length, tally: tally(records) };
  });
  const all = perClass.flatMap((p) => {
    const out: { status: AttendanceStatus }[] = [];
    (['HADIR', 'TERLAMBAT', 'IZIN', 'ALPHA'] as const).forEach((k) => {
      for (let i = 0; i < p.tally[k]; i++) out.push({ status: k });
    });
    return out;
  });
  return { overall: tally(all), perClass };
}

export interface RosterRow {
  user: User;
  record?: Attendance;
  leave?: LeaveRequest;
  /** Effective status; undefined = belum presensi (session still open). */
  status?: AttendanceStatus;
}

export function sessionRoster(state: DemoState, session: Session): RosterRow[] {
  const cls = state.classes.find((c) => c.id === session.classId)!;
  return cls.studentNims
    .map((nim) => {
      const user = userByNim(state, nim)!;
      const record = attendanceFor(state, session.id, nim);
      const leave = leaveFor(state, session.id, nim);
      let status = record?.status;
      if (!status && leave?.decision === 'approved') status = 'IZIN';
      if (!status && session.status === 'SELESAI') status = 'ALPHA';
      return { user, record, leave, status };
    })
    .sort((a, b) => a.user.name.localeCompare(b.user.name));
}

export function labActivity(state: DemoState, labId: string, now: number) {
  const sessions = state.sessions
    .filter((s) => s.labId === labId && s.status !== 'DIBATALKAN')
    .sort((a, b) => a.startsAt - b.startsAt)
    .map((s) => viewSession(state, s));
  const current = sessions.find((s) => s.status === 'DIBUKA' || (s.startsAt <= now && s.endsAt >= now && s.status !== 'SELESAI'));
  const next = sessions.find((s) => s.startsAt > now && s.id !== current?.id && s.status === 'TERJADWAL');
  const today = sessions.filter((s) => new Date(s.startsAt).toDateString() === new Date(now).toDateString());
  return { current, next, today };
}

export function classMatrix(state: DemoState, classId: string) {
  const cls = state.classes.find((c) => c.id === classId)!;
  const sessions = state.sessions.filter((s) => s.classId === classId).sort((a, b) => a.meetingNo - b.meetingNo);
  const rows = cls.studentNims
    .map((nim) => userByNim(state, nim)!)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((user) => {
      const cells = sessions.map((s) => {
        const record = attendanceFor(state, s.id, user.nim);
        if (record) return record.status;
        if (leaveFor(state, s.id, user.nim)?.decision === 'approved') return 'IZIN' as const;
        return s.status === 'SELESAI' ? ('ALPHA' as const) : undefined;
      });
      const finishedCells = cells.filter((_, i) => sessions[i].status === 'SELESAI') as AttendanceStatus[];
      return { user, cells, tally: tally(finishedCells.map((status) => ({ status }))) };
    });
  return { cls, sessions, rows };
}

export const gradeKey = (assignmentId: string, nim: string) => `${assignmentId}__${nim}`;

/**
 * Weighted final grade (0-100). Only items that have been graded for anyone in the class count,
 * so an item nobody has scored yet doesn't pull everyone down. A missing score on a graded item counts as 0.
 */
export function finalGrade(assignments: Assignment[], scores: (number | undefined)[], graded: boolean[]) {
  let weight = 0;
  let total = 0;
  assignments.forEach((a, i) => {
    if (!graded[i]) return;
    weight += a.weight;
    total += ((scores[i] ?? 0) / a.maxScore) * a.weight;
  });
  if (!weight) return undefined;
  return Math.round((total / weight) * 100);
}

export function gradeBook(state: DemoState, classId: string) {
  const cls = state.classes.find((c) => c.id === classId)!;
  const assignments = state.assignments.filter((a) => a.classId === classId).sort((a, b) => a.createdAt - b.createdAt);
  const users = cls.studentNims
    .map((nim) => userByNim(state, nim))
    .filter((u): u is User => !!u)
    .sort((a, b) => a.name.localeCompare(b.name));
  const graded = assignments.map((a) => cls.studentNims.some((nim) => state.grades[gradeKey(a.id, nim)] !== undefined));
  const rows = users.map((user) => {
    const scores = assignments.map((a) => state.grades[gradeKey(a.id, user.nim)]);
    return { user, scores, final: finalGrade(assignments, scores, graded) };
  });
  const weightTotal = assignments.reduce((sum, a) => sum + a.weight, 0);
  return { cls, assignments, graded, rows, weightTotal };
}

/** Letter grade shown next to a final score. */
export function letterGrade(score: number) {
  if (score >= 85) return 'A';
  if (score >= 75) return 'AB';
  if (score >= 70) return 'B';
  if (score >= 65) return 'BC';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

/** Field-by-field changes between two versions of a lab, for confirmations and the audit log. */
export function labDiff(prev: Lab, next: Lab) {
  const out: { label: string; from?: string; to: string }[] = [];
  const cmp = (label: string, a: unknown, b: unknown, fmt: (v: unknown) => string = (v) => String(v ?? '–')) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ label, from: fmt(a), to: fmt(b) });
  };
  cmp('Nama', prev.name, next.name);
  cmp('Kode', prev.code, next.code);
  cmp('Gedung', `${prev.building}, ${prev.floor}`, `${next.building}, ${next.floor}`);
  cmp('Titik', [prev.lat, prev.lng], [next.lat, next.lng], (v) => (v as number[]).map((x) => x.toFixed(5)).join(', '));
  cmp('Radius', prev.radiusM, next.radiusM, (v) => `${v} m`);
  cmp('Akurasi maks', prev.maxAccuracyM, next.maxAccuracyM, (v) => `${v} m`);
  cmp('Kapasitas', prev.capacity, next.capacity);
  cmp('Fasilitas', prev.facilities, next.facilities, (v) => (v as string[]).join(', ') || '–');
  cmp('Foto', prev.photos ?? [], next.photos ?? [], (v) => `${(v as string[]).length} foto`);
  cmp('Petunjuk arah', prev.directions ?? '', next.directions ?? '', (v) => (v as string) || '–');
  return out;
}
