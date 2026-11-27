import { appendLog, type AuditDraft } from './audit';
import { DAY, HOUR, MINUTE, startOfDay } from '@/lib/format';
import type {
  AppNotification,
  Assignment,
  AuditEntry,
  Attendance,
  AttendanceStatus,
  CheckInAttempt,
  ClassGroup,
  Course,
  Fine,
  Grades,
  Lab,
  LeaveRequest,
  NavSlot,
  PaymentTransaction,
  Quiz,
  QuizAttempt,
  Session,
  User,
} from './types';

// Demo dataset, generated relative to "now" so there is always a live session to try.
// Lab coordinates: Lab Informatika B, C and D share one reference point for Gedung E FSM UNDIP
// (Google Maps Plus Code 6P4GXC2R+P82, WGS84). It is a building-level point, not a surveyed room
// centre, so GPS can confirm "inside Gedung E" but cannot tell the three rooms apart.

export interface DemoState {
  version: number;
  users: User[];
  labs: Lab[];
  courses: Course[];
  classes: ClassGroup[];
  sessions: Session[];
  attendance: Attendance[];
  leaves: LeaveRequest[];
  fines: Fine[];
  payments: PaymentTransaction[];
  notifications: AppNotification[];
  attempts: CheckInAttempt[];
  assignments: Assignment[];
  grades: Grades;
  /** Append-only, oldest first. */
  log: AuditEntry[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  /** Bottom bar slots chosen by each user (3 middle slots). Missing = role default. */
  navPrefs: Record<string, NavSlot[]>;
  /** QR signing secrets of open sessions (staff only). */
  qrSecrets: Record<string, string>;
}

export const DEMO_VERSION = 6;

export const DEMO_ACCOUNTS = {
  praktikan: '24060124120001',
  asprak: '24060122130045',
  aslab: '197905102006041001',
} as const;

/** Gedung E FSM UNDIP, building reference point (Plus Code 6P4GXC2R+P82). */
export const GEDUNG_E = { lat: -7.0482375, lng: 110.440765625 };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const roundTo5 = (ms: number) => Math.round(ms / (5 * MINUTE)) * 5 * MINUTE;

const STUDENT_NAMES = [
  'Raka Aditya Pratama', 'Alya Nur Rahmawati', 'Bima Satria Wibowo', 'Citra Ayu Lestari', 'Dimas Arya Nugraha',
  'Eka Putri Maharani', 'Farhan Hakim', 'Gita Permata Sari', 'Hafidz Maulana', 'Intan Kirana Dewi',
  'Joko Santoso', 'Kevin Wijaya', 'Laras Ayuningtyas', 'Muhammad Rizky', 'Nabila Zahra',
  'Oktavian Saputra', 'Putri Anindya', 'Qori Amalia', 'Rendi Firmansyah', 'Sekar Arum',
  'Taufik Hidayat', 'Umi Kalsum', 'Valentino Halim', 'Wulan Septiani', 'Yoga Prasetyo',
  'Zaskia Aurelia', 'Adit Kurniawan', 'Bella Safira', 'Cahyo Nugroho', 'Dinda Maharani',
  'Elang Perkasa', 'Fitri Handayani', 'Galih Ramadhan', 'Hana Pertiwi', 'Ilham Akbar',
  'Jasmine Oktaviani', 'Krisna Wardhana', 'Lutfi Hakim', 'Mira Ananda', 'Naufal Fadhil',
];

const TOPICS: Record<string, string[]> = {
  pab: ['Pengenalan React Native & Expo', 'Komponen & Styling', 'State, Props & Hooks', 'Navigasi dengan Expo Router', 'Form & Validasi', 'Firebase Authentication', 'Cloud Firestore Realtime', 'Lokasi, Geofence & Maps', 'Push Notification', 'Kamera & QR Code', 'Offline & Caching', 'Build & Rilis dengan EAS'],
  bd: ['ERD & Normalisasi', 'DDL & Constraint', 'DML Dasar', 'Join Antar Tabel', 'Subquery', 'Agregasi & Group By', 'View & Hak Akses', 'Stored Procedure', 'Trigger', 'Transaksi & Isolasi', 'Indexing & Query Plan', 'Pengenalan NoSQL'],
  jk: ['Pengenalan Packet Tracer', 'Subnetting IPv4', 'Switch & VLAN', 'Routing Statis', 'Routing Dinamis OSPF', 'DHCP & DNS', 'NAT & PAT', 'Access Control List', 'Wireless LAN', 'IPv6', 'Troubleshooting Jaringan', 'Proyek Topologi Kampus'],
  pbo: ['Class & Object', 'Enkapsulasi', 'Inheritance', 'Polimorfisme', 'Abstract Class & Interface', 'Exception Handling', 'Collections Framework', 'Generics', 'File I/O', 'GUI dengan JavaFX', 'Design Pattern Dasar', 'Proyek Akhir'],
  kb: ['Python untuk AI', 'Uninformed Search', 'Informed Search (A*)', 'Constraint Satisfaction', 'Logika Proposisi', 'Naive Bayes', 'Decision Tree', 'KNN & K-Means', 'Regresi Linear', 'Neural Network Dasar', 'Evaluasi Model', 'Proyek Akhir'],
};

// Keterangan uses light formatting: "# " heading, "- " list item, "~ " small note, **bold**.
const DESCRIPTIONS: Record<string, string> = {
  pab: '# Persiapan\n- Laptop dengan **Node.js** dan **Expo Go** terpasang\n- Starter project dari tautan materi\n~ Modul dibagikan sehari sebelum sesi.',
  bd: 'Gunakan PostgreSQL di PC lab.\n- **Pre-test** di awal sesi, 15 menit\n~ Bawa catatan ERD minggu lalu.',
  jk: 'Simulasi menggunakan **Cisco Packet Tracer 8**.\n~ Laporan dikumpulkan maksimal H+3.',
  pbo: 'Gunakan IntelliJ IDEA di PC lab.\n- Tugas pendahuluan **wajib** dikumpulkan sebelum sesi',
  kb: 'Notebook Jupyter disediakan.\n~ Siapkan akun Google Colab sebagai cadangan.',
};

export function createDemoState(now = Date.now()): DemoState {
  const rand = rng(20261119);
  const today = startOfDay(now);

  // Capacity and facilities are placeholders until the koordinator fills them in.
  const room = (letter: string): Lab => ({
    id: `lab-${letter.toLowerCase()}`,
    code: letter,
    name: `Lab Informatika ${letter}`,
    building: 'Gedung E FSM UNDIP',
    floor: 'Lantai 2',
    ...GEDUNG_E,
    radiusM: 45,
    maxAccuracyM: 40,
    capacity: 40,
    defaultLateAfterMin: 15,
    defaultFineAmount: 10_000,
    facilities: ['PC praktikum', 'Proyektor'],
    photos: [],
  });
  const labs: Lab[] = [room('B'), room('C'), room('D')];

  const courses: Course[] = [
    { id: 'pab', code: 'PAIK6502', name: 'Pemrograman Aplikasi Bergerak', semester: 'Ganjil 2026/2027' },
    { id: 'bd', code: 'PAIK6303', name: 'Basis Data', semester: 'Ganjil 2026/2027' },
    { id: 'jk', code: 'PAIK6304', name: 'Jaringan Komputer', semester: 'Ganjil 2026/2027' },
    { id: 'pbo', code: 'PAIK6301', name: 'Pemrograman Berorientasi Objek', semester: 'Ganjil 2026/2027' },
    { id: 'kb', code: 'PAIK6501', name: 'Kecerdasan Buatan', semester: 'Ganjil 2026/2027' },
  ];

  const students: User[] = STUDENT_NAMES.map((name, i) => ({
    nim: i === 0 ? DEMO_ACCOUNTS.praktikan : `2406012412${String(i + 1).padStart(4, '0')}`,
    name,
    email: `${name.split(' ')[0].toLowerCase()}${i}@students.labsync.id`,
    role: 'PRAKTIKAN',
    angkatan: 2024,
  }));
  const staff: User[] = [
    { nim: DEMO_ACCOUNTS.asprak, name: 'Nadia Kusuma Putri', email: 'nadia@labsync.id', role: 'ASPRAK', angkatan: 2022, phone: '0812-3456-7890' },
    { nim: '24060122140012', name: 'Fajar Ramadhan', email: 'fajar@labsync.id', role: 'ASPRAK', angkatan: 2022 },
    { nim: '24060121130077', name: 'Salsabila Azzahra', email: 'salsa@labsync.id', role: 'ASPRAK', angkatan: 2021 },
    { nim: DEMO_ACCOUNTS.aslab, name: 'Dr. Hendra Wijaya', email: 'koordinator@labsync.id', role: 'ASLAB' },
  ];
  const users = [...students, ...staff];
  const classE = students.slice(0, 26).map((s) => s.nim);
  const classF = students.slice(20).map((s) => s.nim);

  type Anchor = { start: number; durationMin: number; meetingNo: number; status?: Session['status'] };
  const plan: (Omit<ClassGroup, 'weekday' | 'startTime' | 'endTime'> & { anchor: Anchor })[] = [
    { id: 'pab-e', courseId: 'pab', label: 'Kelas E', labId: 'lab-b', assistantNims: [DEMO_ACCOUNTS.asprak], studentNims: classE,
      anchor: { start: roundTo5(now - 25 * MINUTE), durationMin: 120, meetingNo: 8, status: 'DIBUKA' } },
    { id: 'bd-e', courseId: 'bd', label: 'Kelas E', labId: 'lab-c', assistantNims: ['24060122140012'], studentNims: classE,
      anchor: { start: roundTo5(now + 3 * HOUR), durationMin: 100, meetingNo: 7 } },
    { id: 'jk-e', courseId: 'jk', label: 'Kelas E', labId: 'lab-d', assistantNims: ['24060121130077'], studentNims: classE,
      anchor: { start: roundTo5(now - 5 * HOUR), durationMin: 120, meetingNo: 7, status: 'SELESAI' } },
    { id: 'pbo-e', courseId: 'pbo', label: 'Kelas E', labId: 'lab-b', assistantNims: ['24060122140012'], studentNims: classE,
      anchor: { start: today + DAY + 13 * HOUR, durationMin: 100, meetingNo: 7 } },
    { id: 'kb-e', courseId: 'kb', label: 'Kelas E', labId: 'lab-c', assistantNims: ['24060121130077', DEMO_ACCOUNTS.asprak], studentNims: classE,
      anchor: { start: today + 3 * DAY + 9 * HOUR, durationMin: 120, meetingNo: 7 } },
    { id: 'pab-f', courseId: 'pab', label: 'Kelas F', labId: 'lab-d', assistantNims: [DEMO_ACCOUNTS.asprak], studentNims: classF,
      anchor: { start: today + DAY + 8 * HOUR, durationMin: 120, meetingNo: 8 } },
  ];

  const classes: ClassGroup[] = [];
  const sessions: Session[] = [];
  const hhmm = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  for (const { anchor, ...cls } of plan) {
    classes.push({
      ...cls,
      weekday: new Date(anchor.start).getDay(),
      startTime: hhmm(anchor.start),
      endTime: hhmm(anchor.start + anchor.durationMin * MINUTE),
    });
    for (let no = 1; no <= 12; no++) {
      const startsAt = anchor.start + (no - anchor.meetingNo) * 7 * DAY;
      const endsAt = startsAt + anchor.durationMin * MINUTE;
      let status: Session['status'] = endsAt < now ? 'SELESAI' : 'TERJADWAL';
      if (no === anchor.meetingNo && anchor.status) status = anchor.status;
      sessions.push({
        id: `${cls.id}-p${no}`,
        classId: cls.id,
        meetingNo: no,
        topic: TOPICS[cls.courseId][no - 1],
        description: DESCRIPTIONS[cls.courseId],
        labId: cls.labId,
        startsAt,
        endsAt,
        status,
        lateAfterMin: 15,
        materials: [
          { label: `Modul ${no} (PDF)`, url: `https://example.com/${cls.courseId}/modul-${no}.pdf` },
          ...(cls.courseId === 'pab' ? [{ label: 'Starter project', url: 'https://github.com/' }] : []),
        ],
        openedAt: status !== 'TERJADWAL' ? startsAt - 5 * MINUTE : undefined,
        closedAt: status === 'SELESAI' ? endsAt : undefined,
      });
    }
  }

  // A schedule change the student should notice.
  // Class resources (placeholders until asisten paste their real links).
  for (const cls of classes) {
    cls.links = [
      { label: 'Grup WhatsApp kelas', url: 'https://chat.whatsapp.com/' },
      { label: 'Folder modul (Drive)', url: 'https://drive.google.com/' },
    ];
  }

  const kbNext = sessions.find((s) => s.id === 'kb-e-p7');
  if (kbNext) {
    kbNext.startsAt += HOUR;
    kbNext.endsAt += HOUR;
    kbNext.changeNote = 'Jadwal mundur 1 jam karena lab dipakai ujian.';
  }

  const attendance: Attendance[] = [];
  const me = DEMO_ACCOUNTS.praktikan;
  for (const session of sessions) {
    if (session.status !== 'SELESAI') continue;
    const cls = classes.find((c) => c.id === session.classId)!;
    for (const nim of cls.studentNims) {
      const r = rand();
      let status: AttendanceStatus = r < 0.8 ? 'HADIR' : r < 0.88 ? 'TERLAMBAT' : r < 0.93 ? 'IZIN' : 'ALPHA';
      if (nim === me) status = session.id === 'bd-e-p3' ? 'IZIN' : session.id === 'pbo-e-p2' ? 'ALPHA' : session.id === 'jk-e-p5' ? 'TERLAMBAT' : 'HADIR';
      const late = status === 'TERLAMBAT';
      attendance.push({
        id: `${session.id}__${nim}`,
        sessionId: session.id,
        nim,
        status,
        method: status === 'IZIN' || status === 'ALPHA' ? 'MANUAL' : rand() > 0.5 ? 'QR' : 'GEO',
        checkedInAt: session.startsAt + (late ? 18 + Math.floor(rand() * 20) : Math.floor(rand() * 12)) * MINUTE,
        distanceM: status === 'HADIR' || late ? Math.round(4 + rand() * 28) : undefined,
        accuracyM: status === 'HADIR' || late ? Math.round(6 + rand() * 14) : undefined,
      });
    }
  }

  // Live session: most of the class is already in.
  const live = sessions.find((s) => s.status === 'DIBUKA')!;
  classE.slice(1, 17).forEach((nim, i) => {
    const late = i > 12;
    attendance.push({
      id: `${live.id}__${nim}`,
      sessionId: live.id,
      nim,
      status: late ? 'TERLAMBAT' : 'HADIR',
      method: i % 3 === 0 ? 'GEO' : 'QR',
      checkedInAt: live.startsAt - 6 * MINUTE + i * 90_000,
      distanceM: Math.round(3 + rand() * 30),
      accuracyM: Math.round(5 + rand() * 12),
    });
  });

  const attempts: CheckInAttempt[] = [
    { id: 'att-1', sessionId: live.id, nim: classE[18], at: now - 9 * MINUTE, ok: false, method: 'GEO', failure: 'OUT_OF_RADIUS', distanceM: 186, accuracyM: 12 },
    { id: 'att-2', sessionId: live.id, nim: classE[21], at: now - 6 * MINUTE, ok: false, method: 'GEO', failure: 'MOCK_LOCATION', accuracyM: 3 },
    { id: 'att-3', sessionId: live.id, nim: classE[18], at: now - 4 * MINUTE, ok: false, method: 'GEO', failure: 'LOW_ACCURACY', distanceM: 42, accuracyM: 71 },
  ];

  const leaves: LeaveRequest[] = [
    { id: `bd-e-p3__${me}`, sessionId: 'bd-e-p3', nim: me, category: 'Sakit', reason: 'Demam tinggi sejak malam, sudah periksa ke klinik kampus. Surat keterangan dokter terlampir.', attachmentName: 'surat-dokter.pdf', submittedAt: sessions.find((s) => s.id === 'bd-e-p3')!.startsAt - 6 * HOUR, decision: 'approved', reviewedBy: '24060122140012', reviewedAt: sessions.find((s) => s.id === 'bd-e-p3')!.startsAt - 2 * HOUR, reviewNote: 'Semoga cepat sembuh. Kerjakan modul 3 secara mandiri.' },
    { id: `pbo-e-p7__${me}`, sessionId: 'pbo-e-p7', nim: me, category: 'Akademik', reason: 'Mewakili jurusan di lomba GEMASTIK tingkat nasional pada hari yang sama.', attachmentName: 'surat-tugas.pdf', submittedAt: now - 20 * HOUR, decision: 'pending' },
    { id: `pab-e-p9__${classE[5]}`, sessionId: 'pab-e-p9', nim: classE[5], category: 'Keluarga', reason: 'Menghadiri pernikahan kakak di luar kota.', submittedAt: now - 3 * HOUR, decision: 'pending' },
    { id: `pab-e-p8__${classE[19]}`, sessionId: 'pab-e-p8', nim: classE[19], category: 'Sakit', reason: 'Sakit perut dan muntah sejak pagi, tidak kuat berangkat.', attachmentName: 'foto-resep.jpg', submittedAt: now - 2 * HOUR, decision: 'pending' },
    { id: `pab-f-p8__${classF[3]}`, sessionId: 'pab-f-p8', nim: classF[3], category: 'Akademik', reason: 'Ikut kegiatan BEM: kunjungan industri ke Jakarta.', submittedAt: now - 26 * HOUR, decision: 'pending' },
    { id: `pab-e-p6__${classE[7]}`, sessionId: 'pab-e-p6', nim: classE[7], category: 'Lainnya', reason: 'Bangun kesiangan.', submittedAt: sessions.find((s) => s.id === 'pab-e-p6')!.startsAt + 10 * MINUTE, decision: 'rejected', reviewedBy: DEMO_ACCOUNTS.asprak, reviewedAt: sessions.find((s) => s.id === 'pab-e-p6')!.startsAt + 2 * HOUR, reviewNote: 'Alasan tidak memenuhi ketentuan izin.' },
  ];

  const fines: Fine[] = [
    { id: `jk-e-p5__${me}`, nim: me, sessionId: 'jk-e-p5', classId: 'jk-e', attendanceId: `jk-e-p5__${me}`, amount: 10_000, status: 'unpaid', createdAt: now - 14 * DAY },
    { id: `pab-e-p6__${classE[1]}`, nim: classE[1], sessionId: 'pab-e-p6', classId: 'pab-e', attendanceId: `pab-e-p6__${classE[1]}`, amount: 10_000, status: 'paid', createdAt: now - 12 * DAY, paidAt: now - 11 * DAY, latestOrderId: 'LS-pab-e-p6-paid' },
    { id: `pab-e-p7__${classE[2]}`, nim: classE[2], sessionId: 'pab-e-p7', classId: 'pab-e', attendanceId: `pab-e-p7__${classE[2]}`, amount: 10_000, status: 'pending', createdAt: now - 5 * DAY, latestOrderId: 'LS-pab-e-p7-pend' },
    { id: `bd-e-p4__${classE[4]}`, nim: classE[4], sessionId: 'bd-e-p4', classId: 'bd-e', attendanceId: `bd-e-p4__${classE[4]}`, amount: 10_000, status: 'unpaid', createdAt: now - 2 * DAY, latestOrderId: 'LS-bd-e-p4-fail' },
  ];

  const payments: PaymentTransaction[] = [
    { id: 'LS-pab-e-p6-paid', fineId: `pab-e-p6__${classE[1]}`, nim: classE[1], sessionId: 'pab-e-p6', classId: 'pab-e', amount: 10_000, status: 'success', paymentType: 'qris', createdAt: now - 11 * DAY - HOUR, updatedAt: now - 11 * DAY, paidAt: now - 11 * DAY },
    { id: 'LS-pab-e-p7-pend', fineId: `pab-e-p7__${classE[2]}`, nim: classE[2], sessionId: 'pab-e-p7', classId: 'pab-e', amount: 10_000, status: 'pending', paymentType: 'bank_transfer', createdAt: now - 2 * HOUR, updatedAt: now - 2 * HOUR },
    { id: 'LS-bd-e-p4-fail', fineId: `bd-e-p4__${classE[4]}`, nim: classE[4], sessionId: 'bd-e-p4', classId: 'bd-e', amount: 10_000, status: 'failed', paymentType: 'gopay', createdAt: now - DAY, updatedAt: now - DAY + 15 * MINUTE },
  ];

  const notifications: AppNotification[] = [
    { id: 'n-1', nim: me, type: 'SESSION_OPENED', title: 'Sesi dibuka · Pemrograman Aplikasi Bergerak', body: 'Pertemuan 8: Lokasi, Geofence & Maps di Lab Informatika B. Presensi sekarang.', createdAt: live.openedAt ?? now - 30 * MINUTE, href: `/presensi/${live.id}` },
    { id: 'n-2', nim: me, type: 'SCHEDULE_CHANGED', title: 'Jadwal berubah · Kecerdasan Buatan', body: 'Pertemuan 7 mundur 1 jam karena lab dipakai ujian.', createdAt: now - 18 * HOUR, href: '/sesi/kb-e-p7' },
    { id: 'n-3', nim: me, type: 'REMINDER', title: 'Pengingat · Basis Data', body: 'Pertemuan 7 dimulai 3 jam lagi di Lab Informatika C.', createdAt: now - 10 * MINUTE, href: '/sesi/bd-e-p7' },
    { id: 'n-4', nim: me, type: 'LEAVE_APPROVED', title: 'Izin disetujui · Basis Data', body: 'Izin sakit untuk pertemuan 3 disetujui oleh Fajar Ramadhan.', createdAt: now - 30 * DAY, readAt: now - 29 * DAY, href: `/izin/bd-e-p3__${me}` },
    { id: 'n-5', nim: DEMO_ACCOUNTS.asprak, type: 'LEAVE_SUBMITTED', title: 'Izin baru · Pemrograman Aplikasi Bergerak', body: `${STUDENT_NAMES[19]} mengajukan izin sakit untuk pertemuan 8.`, createdAt: now - 2 * HOUR, href: `/izin/pab-e-p8__${classE[19]}` },
    { id: 'n-6', nim: DEMO_ACCOUNTS.asprak, type: 'LEAVE_SUBMITTED', title: 'Izin baru · Pemrograman Aplikasi Bergerak', body: `${STUDENT_NAMES[5]} mengajukan izin keluarga untuk pertemuan 9.`, createdAt: now - 3 * HOUR, href: `/izin/pab-e-p9__${classE[5]}` },
    { id: 'n-7', nim: DEMO_ACCOUNTS.aslab, type: 'SYSTEM', title: 'Permintaan akses asprak', body: 'Galih Ramadhan meminta akses asprak untuk Jaringan Komputer.', createdAt: now - 5 * HOUR, href: '/admin' },
  ];

  // Grade book: three weighted items per class. The last one is not graded yet for most classes.
  const assignments: Assignment[] = [];
  const grades: Grades = {};
  for (const cls of classes) {
    // PAB Kelas E also has the quiz of the live meeting as a graded item.
    const items: [string, number][] = cls.id === 'pab-e'
      ? [['Tugas pendahuluan', 20], ['Laporan praktikum', 30], ['Responsi', 40]]
      : [['Tugas pendahuluan', 20], ['Laporan praktikum', 40], ['Responsi', 40]];
    items.forEach(([title, weight], i) => {
      const a: Assignment = { id: `${cls.id}-t${i + 1}`, classId: cls.id, title, weight, maxScore: 100, createdAt: now - (30 - i * 10) * DAY };
      assignments.push(a);
      if (i === 2 && cls.id !== 'jk-e') return;
      for (const nim of cls.studentNims) {
        if (rand() < 0.05) continue;
        grades[`${a.id}__${nim}`] = Math.round(62 + rand() * 36);
      }
    });
  }

  // Quiz in the live meeting of PAB Kelas E, open now, linked to the grade book.
  const quizAssignment: Assignment = { id: 'pab-e-kuis8', classId: 'pab-e', title: 'Kuis P8', weight: 10, maxScore: 100, createdAt: live.startsAt };
  assignments.push(quizAssignment);
  const quiz: Quiz = {
    id: 'kuis-pab-e-p8',
    sessionId: live.id,
    classId: 'pab-e',
    title: 'Kuis Lokasi & Geofence',
    durationMin: 20,
    maxWarnings: 3,
    shuffle: true,
    requireAttendance: true,
    assignmentId: quizAssignment.id,
    status: 'DIBUKA',
    createdBy: DEMO_ACCOUNTS.asprak,
    createdAt: live.startsAt - DAY,
    openedAt: now - 14 * MINUTE,
    questions: [
      { id: 'q1', type: 'PILGAN', points: 20, prompt: 'Modul Expo yang dipakai untuk membaca posisi GPS perangkat adalah…', options: ['expo-location', 'expo-sensors', 'expo-maps', 'expo-device'], correct: 0 },
      { id: 'q2', type: 'PILGAN', points: 20, prompt: 'Jika akurasi GPS 60 m sedangkan radius lab 45 m, presensi sebaiknya…', options: ['Diterima, karena posisi tetap di dalam radius', 'Ditolak dan diminta mencoba lagi atau memakai QR', 'Diterima dengan status terlambat', 'Dicatat sebagai alpha'], correct: 1 },
      { id: 'q3', type: 'PILGAN', points: 20, prompt: 'Rumus untuk menghitung jarak dua titik koordinat di permukaan bumi adalah…', options: ['Pythagoras', 'Haversine', 'Dijkstra', 'Euclid 3D'], correct: 1 },
      { id: 'q4', type: 'ISIAN', points: 20, prompt: 'Sebutkan izin Android yang dibutuhkan untuk lokasi presisi.', options: [], answerKey: 'ACCESS_FINE_LOCATION|android.permission.ACCESS_FINE_LOCATION' },
      { id: 'q5', type: 'ISIAN', points: 20, prompt: 'Jelaskan singkat mengapa presensi tidak cukup hanya dengan GPS.', options: [] },
    ],
  };
  const ids = quiz.questions.map((q) => q.id);
  const opened = quiz.openedAt!;
  const quizAttempts: QuizAttempt[] = [
    { nim: classE[1], status: 'DIKUMPULKAN', answers: { q1: 0, q2: 1, q3: 1, q4: 'ACCESS_FINE_LOCATION', q5: 'GPS bisa dipalsukan dan akurasinya turun di dalam gedung.' }, violations: [], done: 9 },
    { nim: classE[2], status: 'DIKUMPULKAN', answers: { q1: 0, q2: 0, q3: 1, q4: 'fine location', q5: 'Karena bisa fake GPS.' }, violations: [{ kind: 'KELUAR_APLIKASI', min: 3 }], done: 11 },
    { nim: classE[3], status: 'MENGERJAKAN', answers: { q1: 0, q2: 1 }, violations: [{ kind: 'KELUAR_APLIKASI', min: 4 }, { kind: 'SCREENSHOT', min: 6 }] },
    { nim: classE[4], status: 'MENGERJAKAN', answers: { q1: 2 }, violations: [] },
    { nim: classE[6], status: 'DIKELUARKAN', answers: { q1: 0, q2: 1, q3: 0 }, violations: [{ kind: 'KELUAR_APLIKASI', min: 2 }, { kind: 'KELUAR_APLIKASI', min: 3 }, { kind: 'SCREENSHOT', min: 5 }, { kind: 'KELUAR_APLIKASI', min: 7 }], done: 7 },
  ].map((a, i) => ({
    id: `${quiz.id}__${a.nim}`,
    quizId: quiz.id,
    nim: a.nim,
    startedAt: opened + i * MINUTE,
    deadline: opened + i * MINUTE + quiz.durationMin * MINUTE,
    order: ids,
    answers: a.answers as Record<string, number | string>,
    violations: a.violations.map((v) => ({ at: opened + (i + v.min) * MINUTE, kind: v.kind as 'KELUAR_APLIKASI' | 'SCREENSHOT' })),
    allowance: 0,
    status: a.status as QuizAttempt['status'],
    submittedAt: a.done ? opened + (i + a.done) * MINUTE : undefined,
    manual: {},
  }));

  // Audit history consistent with the records above (reviews, an override, grade edits, lab update).
  const overridden = attendance.find((a) => a.id === `pab-e-p7__${classE[3]}`);
  const overriddenFrom = overridden?.status ?? 'ALPHA';
  if (overridden) {
    overridden.status = 'IZIN';
    overridden.method = 'MANUAL';
    overridden.note = 'Surat sakit menyusul';
    overridden.overriddenBy = DEMO_ACCOUNTS.asprak;
  }
  const revised = `pab-e-t2__${classE[1]}`;
  grades[revised] = 85;
  const nameOf = (nim: string) => users.find((u) => u.nim === nim)?.name ?? nim;
  const drafts: AuditDraft[] = [
    { at: now - 32 * DAY, actor: DEMO_ACCOUNTS.aslab, actorRole: 'ASLAB', kind: 'KELAS', classId: 'pab-e', target: 'Pemrograman Aplikasi Bergerak · Kelas E', summary: 'Membuat kelas dengan 12 pertemuan', changes: [{ label: 'Asprak', to: nameOf(DEMO_ACCOUNTS.asprak) }, { label: 'Praktikan', to: `${classE.length} orang` }] },
    { at: sessions.find((s) => s.id === 'bd-e-p3')!.startsAt - 2 * HOUR, actor: '24060122140012', actorRole: 'ASPRAK', kind: 'IZIN', classId: 'bd-e', target: `${nameOf(me)} · Pertemuan 3`, summary: 'Menyetujui izin sakit', changes: [{ label: 'Keputusan', from: 'Menunggu', to: 'Disetujui' }] },
    { at: sessions.find((s) => s.id === 'pab-e-p6')!.startsAt + 2 * HOUR, actor: DEMO_ACCOUNTS.asprak, actorRole: 'ASPRAK', kind: 'IZIN', classId: 'pab-e', target: `${nameOf(classE[7])} · Pertemuan 6`, summary: 'Menolak izin', changes: [{ label: 'Keputusan', from: 'Menunggu', to: 'Ditolak' }], reason: 'Alasan tidak memenuhi ketentuan izin.' },
    { at: now - 9 * DAY, actor: DEMO_ACCOUNTS.asprak, actorRole: 'ASPRAK', kind: 'NILAI', classId: 'pab-e', target: 'Laporan praktikum', summary: `Mengisi ${classE.length} nilai`, changes: [{ label: 'Laporan praktikum', from: 'kosong', to: `${classE.length} nilai` }] },
    { at: now - 6 * DAY, actor: DEMO_ACCOUNTS.asprak, actorRole: 'ASPRAK', kind: 'PRESENSI', classId: 'pab-e', target: `${nameOf(classE[3])} · Pertemuan 7`, summary: 'Mengubah status presensi', changes: [{ label: 'Status', from: overriddenFrom, to: 'IZIN' }], reason: 'Surat sakit menyusul' },
    { at: now - 2 * DAY, actor: DEMO_ACCOUNTS.asprak, actorRole: 'ASPRAK', kind: 'NILAI', classId: 'pab-e', target: `${nameOf(classE[1])} · Laporan praktikum`, summary: 'Mengubah nilai', changes: [{ label: 'Laporan praktikum', from: '78', to: '85' }], reason: 'Revisi laporan diterima' },
    { at: now - 1 * DAY, actor: DEMO_ACCOUNTS.aslab, actorRole: 'ASLAB', kind: 'LAB', target: 'Lab Informatika B, C, D', summary: 'Memperbarui koordinat ke patokan Gedung E', changes: [{ label: 'Titik', to: `${GEDUNG_E.lat.toFixed(5)}, ${GEDUNG_E.lng.toFixed(5)}` }], reason: 'Koordinat presisi per ruangan belum tersedia.' },
    { at: quiz.createdAt, actor: DEMO_ACCOUNTS.asprak, actorRole: 'ASPRAK', kind: 'KUIS', classId: 'pab-e', target: quiz.title, summary: 'Membuat kuis 5 soal', changes: [{ label: 'Masuk penilaian', to: 'Kuis P8 · 10%' }] },
    { at: opened, actor: DEMO_ACCOUNTS.asprak, actorRole: 'ASPRAK', kind: 'KUIS', classId: 'pab-e', target: quiz.title, summary: 'Membuka kuis', changes: [{ label: 'Status', from: 'Draft', to: 'Dibuka' }] },
  ];
  const log = drafts.sort((a, b) => (a.at ?? 0) - (b.at ?? 0)).reduce<AuditEntry[]>((acc, d) => appendLog(acc, d), []);

  return {
    version: DEMO_VERSION,
    users,
    labs,
    courses,
    classes,
    sessions,
    attendance,
    leaves,
    fines,
    payments,
    notifications,
    attempts,
    assignments,
    grades,
    log,
    quizzes: [quiz],
    quizAttempts,
    navPrefs: {},
    // Demo mode signs QR codes with these; the Firebase seed makes random ones in sessionSecrets.
    qrSecrets: Object.fromEntries(sessions.filter((x) => x.status === 'DIBUKA').map((x) => [x.id, `demo-${x.id}-${Math.floor(rand() * 1e9).toString(16)}`])),
  };
}
