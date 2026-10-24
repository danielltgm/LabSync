import type { Session } from '@/types/session';
import type { UserProfile } from '@/types/user';

// Sprint 1 seeds from docs/erd.md. Reloading resets the in-memory demo.
export const DUMMY_USERS: UserProfile[] = [
  { id: 'u-asisten-1', name: 'Yudha Pratama', identifier: 'AST-001', role: 'ASISTEN' },
  {
    id: 'u-mhs-1', name: 'Agil Saputra', identifier: '123210001',
    role: 'PRAKTISAN', className: 'IF-3A',
  },
  {
    id: 'u-mhs-2', name: 'Zufar Ramadhan', identifier: '123210002',
    role: 'PRAKTISAN', className: 'IF-3A',
  },
];

export const INITIAL_SESSIONS: Session[] = [
  {
    id: 'ses-001', courseName: 'Pemrograman Mobile', className: 'IF-3A',
    labRoom: 'Lab Rekayasa Perangkat Lunak', startTime: '08:00', endTime: '10:00',
    date: '2026-10-22', status: 'TERJADWAL', assistantName: 'Yudha Pratama',
  },
  {
    id: 'ses-002', courseName: 'Basis Data Lanjut', className: 'SI-3B',
    labRoom: 'Lab Basis Data Terdistribusi', startTime: '10:30', endTime: '12:30',
    date: '2026-10-22', status: 'DIBUKA', assistantName: 'Yudha Pratama',
  },
  {
    id: 'ses-003', courseName: 'Jaringan Komputer', className: 'IF-3C',
    labRoom: 'Lab Jaringan & Keamanan', startTime: '13:30', endTime: '15:30',
    date: '2026-10-22', status: 'SELESAI', assistantName: 'Yudha Pratama',
  },
];
