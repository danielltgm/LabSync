import { Platform } from 'react-native';

import type { DemoState } from '@/data/demo-seed';
import { classMatrix, gradeBook, letterGrade, sessionRoster, userByNim, viewSession } from '@/data/selectors';
import type { AttendanceStatus, AuditEntry } from '@/data/types';
import { formatDate, formatTime, toDateInput } from '@/lib/format';

type Cell = { value?: string | number; fontWeight?: 'bold'; backgroundColor?: string; color?: string; align?: 'center' | 'left' | 'right'; type?: StringConstructor | NumberConstructor } | null;
type Sheet = { sheet: string; data: Cell[][]; columns?: { width?: number }[]; stickyRowsCount?: number; stickyColumnsCount?: number };

const HEAD = (value: string): Cell => ({ value, fontWeight: 'bold', backgroundColor: '#E8EBFB', color: '#1F2A7A' });
const FILL: Record<AttendanceStatus, string> = { HADIR: '#DDF3E8', TERLAMBAT: '#FCEFD2', IZIN: '#DCEBFA', ALPHA: '#FBE0DD' };
const CODE: Record<AttendanceStatus, string> = { HADIR: 'H', TERLAMBAT: 'T', IZIN: 'I', ALPHA: 'A' };
const str = (value: string | number | undefined): Cell => ({ value: value === undefined ? '' : String(value), type: String });
const num = (value: number): Cell => ({ value, type: Number, align: 'center' });

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Native: build the .xlsx in memory and hand it to the share sheet (Drive, WhatsApp, Files…).
 * write-excel-file's universal build ends with `new Blob([arrayBuffer])`, which React Native's Blob
 * can't construct, so a short-lived stand-in captures the bytes instead. Small sheets zip
 * synchronously (fflate only uses Workers above ~160 kB per file).
 */
async function xlsxBytes(sheets: Sheet[]): Promise<Uint8Array> {
  const { default: writeXlsxFile } = await import('write-excel-file/universal');
  const g = globalThis as unknown as { Blob: unknown };
  const RealBlob = g.Blob;
  let bytes: Uint8Array | null = null;
  g.Blob = function CaptureBlob(parts: unknown[]) {
    const part = parts[0];
    bytes = part instanceof Uint8Array ? part : new Uint8Array(part as ArrayBuffer);
    return {};
  };
  try {
    await writeXlsxFile(sheets as never).toBlob();
  } finally {
    g.Blob = RealBlob;
  }
  if (!bytes) throw new Error('XLSX_EMPTY');
  return bytes;
}

async function write(sheets: Sheet[], fileName: string) {
  if (Platform.OS === 'web') {
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    await writeXlsxFile(sheets as never).toFile(fileName);
    return;
  }
  const bytes = await xlsxBytes(sheets);
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, fileName.replace(/[\\/:*?"<>|]/g, '-'));
  file.create({ overwrite: true });
  file.write(bytes);
  const Sharing = await import('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) throw new Error('SHARE_UNAVAILABLE');
  await Sharing.shareAsync(file.uri, { mimeType: XLSX_MIME, dialogTitle: fileName, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}

export async function exportClassRecap(state: DemoState, classId: string) {
  const { cls, sessions, rows } = classMatrix(state, classId);
  const course = state.courses.find((c) => c.id === cls.courseId)!;
  const lab = state.labs.find((l) => l.id === cls.labId);

  const matrix: Cell[][] = [
    [{ value: `Rekap Kehadiran ${course.name} · ${cls.label}`, fontWeight: 'bold' }],
    [str(`${course.code} · ${course.semester} · ${lab?.name ?? ''} · diekspor ${formatDate(Date.now(), { year: true })}`)],
    [],
    [HEAD('No'), HEAD('NIM'), HEAD('Nama'), ...sessions.map((s) => HEAD(`P${s.meetingNo}`)), HEAD('H'), HEAD('T'), HEAD('I'), HEAD('A'), HEAD('% Hadir')],
    ...rows.map((r, i) => [
      num(i + 1),
      str(r.user.nim),
      str(r.user.name),
      ...r.cells.map((c): Cell => (c ? { value: CODE[c], align: 'center', backgroundColor: FILL[c] } : str(''))),
      num(r.tally.HADIR),
      num(r.tally.TERLAMBAT),
      num(r.tally.IZIN),
      num(r.tally.ALPHA),
      { value: r.tally.rate, type: Number, align: 'center', fontWeight: 'bold', color: r.tally.rate < 75 ? '#B3261E' : '#0E5E33' } as Cell,
    ]),
  ];

  const detail: Cell[][] = [
    [HEAD('Pertemuan'), HEAD('Topik'), HEAD('Tanggal'), HEAD('NIM'), HEAD('Nama'), HEAD('Status'), HEAD('Waktu'), HEAD('Metode'), HEAD('Jarak (m)'), HEAD('Catatan')],
  ];
  sessions.forEach((s) => {
    sessionRoster(state, s).forEach((row) => {
      if (!row.status) return;
      detail.push([
        num(s.meetingNo),
        str(s.topic),
        str(toDateInput(s.startsAt)),
        str(row.user.nim),
        str(row.user.name),
        { value: row.status, backgroundColor: FILL[row.status] },
        str(row.record ? formatTime(row.record.checkedInAt) : '-'),
        str(row.record?.method ?? '-'),
        row.record?.distanceM !== undefined ? num(row.record.distanceM) : str('-'),
        str(row.record?.note ?? row.leave?.category ?? ''),
      ]);
    });
  });

  const leaves: Cell[][] = [[HEAD('Pertemuan'), HEAD('NIM'), HEAD('Nama'), HEAD('Kategori'), HEAD('Alasan'), HEAD('Status'), HEAD('Ditinjau oleh')]];
  state.leaves
    .filter((l) => sessions.some((s) => s.id === l.sessionId))
    .forEach((l) => {
      const s = sessions.find((x) => x.id === l.sessionId)!;
      leaves.push([
        num(s.meetingNo),
        str(l.nim),
        str(userByNim(state, l.nim)?.name),
        str(l.category),
        str(l.reason),
        str(l.decision === 'approved' ? 'Disetujui' : l.decision === 'rejected' ? 'Ditolak' : 'Menunggu'),
        str(l.reviewedBy ? userByNim(state, l.reviewedBy)?.name : ''),
      ]);
    });

  await write(
    [
      { sheet: 'Rekap', data: matrix, columns: [{ width: 5 }, { width: 17 }, { width: 28 }, ...sessions.map(() => ({ width: 5 })), { width: 5 }, { width: 5 }, { width: 5 }, { width: 5 }, { width: 9 }], stickyRowsCount: 4, stickyColumnsCount: 3 },
      { sheet: 'Detail presensi', data: detail, columns: [{ width: 10 }, { width: 30 }, { width: 12 }, { width: 17 }, { width: 28 }, { width: 12 }, { width: 8 }, { width: 9 }, { width: 9 }, { width: 30 }], stickyRowsCount: 1 },
      { sheet: 'Izin', data: leaves, columns: [{ width: 10 }, { width: 17 }, { width: 28 }, { width: 12 }, { width: 50 }, { width: 12 }, { width: 24 }], stickyRowsCount: 1 },
    ],
    `Rekap ${course.name} ${cls.label}.xlsx`,
  );
}

const scoreCell = (score: number | undefined, bold = false): Cell =>
  score === undefined
    ? str('')
    : { value: score, type: Number, align: 'center', fontWeight: bold ? 'bold' : undefined, color: score >= 75 ? '#0E5E33' : score >= 60 ? '#8A5A00' : '#B3261E' };

export async function exportClassGrades(state: DemoState, classId: string) {
  const { cls, assignments, graded, rows, weightTotal } = gradeBook(state, classId);
  const course = state.courses.find((c) => c.id === cls.courseId)!;
  const finals = rows.map((r) => r.final).filter((x): x is number => x !== undefined);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : undefined);

  const sheet: Cell[][] = [
    [{ value: `Nilai ${course.name} · ${cls.label}`, fontWeight: 'bold' }],
    [str(`${course.code} · ${course.semester} · bobot total ${weightTotal}% · diekspor ${formatDate(Date.now(), { year: true })}`)],
    [],
    [HEAD('No'), HEAD('NIM'), HEAD('Nama'), ...assignments.map((a) => HEAD(`${a.title} (${a.weight}%)`)), HEAD('Nilai akhir'), HEAD('Huruf')],
    ...rows.map((r, i) => [
      num(i + 1),
      str(r.user.nim),
      str(r.user.name),
      ...r.scores.map((s) => scoreCell(s)),
      scoreCell(r.final, true),
      { value: r.final === undefined ? '' : letterGrade(r.final), align: 'center', fontWeight: 'bold' } as Cell,
    ]),
    [
      null,
      null,
      { value: 'Rata-rata kelas', fontWeight: 'bold' },
      ...assignments.map((a) => scoreCell(avg(rows.map((r) => r.scores[assignments.indexOf(a)]).filter((x): x is number => x !== undefined)), true)),
      scoreCell(avg(finals), true),
      null,
    ],
  ];

  const parts: Cell[][] = [
    [HEAD('Komponen'), HEAD('Bobot (%)'), HEAD('Dinilai'), HEAD('Terisi'), HEAD('Rata-rata')],
    ...assignments.map((a, i) => {
      const xs = rows.map((r) => r.scores[i]).filter((x): x is number => x !== undefined);
      return [str(a.title), num(a.weight), str(graded[i] ? 'Ya' : 'Belum'), str(`${xs.length}/${rows.length}`), scoreCell(avg(xs))];
    }),
  ];

  await write(
    [
      { sheet: 'Nilai', data: sheet, columns: [{ width: 5 }, { width: 17 }, { width: 28 }, ...assignments.map(() => ({ width: 16 })), { width: 11 }, { width: 7 }], stickyRowsCount: 4, stickyColumnsCount: 3 },
      { sheet: 'Komponen', data: parts, columns: [{ width: 28 }, { width: 10 }, { width: 9 }, { width: 9 }, { width: 10 }], stickyRowsCount: 1 },
    ],
    `Nilai ${course.name} ${cls.label}.xlsx`,
  );
}

export async function exportSessionRecap(state: DemoState, sessionId: string) {
  const session = viewSession(state, state.sessions.find((s) => s.id === sessionId)!);
  const roster = sessionRoster(state, session);
  const data: Cell[][] = [
    [{ value: `${session.course.name} · ${session.cls.label} · Pertemuan ${session.meetingNo}`, fontWeight: 'bold' }],
    [str(`${session.topic} · ${formatDate(session.startsAt, { weekday: true, year: true })} · ${session.lab.name}`)],
    [],
    [HEAD('No'), HEAD('NIM'), HEAD('Nama'), HEAD('Status'), HEAD('Waktu'), HEAD('Metode'), HEAD('Jarak (m)'), HEAD('Akurasi (m)'), HEAD('Catatan')],
    ...roster.map((r, i) => [
      num(i + 1),
      str(r.user.nim),
      str(r.user.name),
      r.status ? { value: r.status, backgroundColor: FILL[r.status] } : str('Belum presensi'),
      str(r.record ? formatTime(r.record.checkedInAt) : '-'),
      str(r.record?.method ?? '-'),
      r.record?.distanceM !== undefined ? num(r.record.distanceM) : str('-'),
      r.record?.accuracyM !== undefined ? num(r.record.accuracyM) : str('-'),
      str(r.record?.note ?? (r.leave ? `Izin ${r.leave.category}` : '')),
    ]),
  ];
  await write(
    [{ sheet: `P${session.meetingNo}`, data, columns: [{ width: 5 }, { width: 17 }, { width: 28 }, { width: 13 }, { width: 8 }, { width: 9 }, { width: 10 }, { width: 11 }, { width: 30 }], stickyRowsCount: 4 }],
    `Presensi ${session.course.name} ${session.cls.label} P${session.meetingNo}.xlsx`,
  );
}

export async function exportAuditLog(state: DemoState, entries: AuditEntry[]) {
  const ROLE = { PRAKTIKAN: 'Praktikan', ASPRAK: 'Asprak', ASLAB: 'Aslab' } as const;
  const data: Cell[][] = [
    [{ value: 'Log perubahan LabSync', fontWeight: 'bold' }],
    [str(`${entries.length} catatan · diekspor ${formatDate(Date.now(), { year: true })} · urut dari terbaru`)],
    [],
    [HEAD('Waktu'), HEAD('Oleh'), HEAD('Peran'), HEAD('Jenis'), HEAD('Kelas'), HEAD('Subjek'), HEAD('Ringkasan'), HEAD('Perubahan'), HEAD('Alasan'), HEAD('Hash')],
    ...[...entries]
      .sort((a, b) => b.at - a.at)
      .map((e) => {
        const cls = e.classId ? state.classes.find((c) => c.id === e.classId) : undefined;
        const course = cls ? state.courses.find((c) => c.id === cls.courseId) : undefined;
        return [
          str(`${toDateInput(e.at)} ${formatTime(e.at)}`),
          str(userByNim(state, e.actor)?.name ?? e.actor),
          str(ROLE[e.actorRole]),
          str(e.kind),
          str(course ? `${course.name} ${cls!.label}` : ''),
          str(e.target),
          str(e.summary),
          str((e.changes ?? []).map((c) => `${c.label}: ${c.from !== undefined ? `${c.from} → ` : ''}${c.to}`).join('; ')),
          str(e.reason ?? ''),
          str(e.hash),
        ];
      }),
  ];
  await write(
    [{ sheet: 'Log', data, columns: [{ width: 17 }, { width: 24 }, { width: 12 }, { width: 11 }, { width: 30 }, { width: 32 }, { width: 28 }, { width: 50 }, { width: 30 }, { width: 16 }], stickyRowsCount: 4 }],
    `Log LabSync ${toDateInput(Date.now())}.xlsx`,
  );
}

export function exportErrorMessage(error: unknown) {
  return error instanceof Error && error.message === 'SHARE_UNAVAILABLE'
    ? 'Perangkat ini tidak bisa membagikan file.'
    : 'Export gagal. Coba lagi.';
}
