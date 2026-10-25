// Read-only fixture for isolated component tests. App routes use the runtime context.
export const PREVIEW_ATTENDANCES = [
  {
    id: 'att-001',
    sessionId: 'ses-002',
    studentId: '123210001',
    studentName: 'Agil Saputra',
    className: 'SI-3B',
    checkInTime: '10:35:14',
    notes: 'PC-09',
  },
] as const;
