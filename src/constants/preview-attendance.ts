// Read-only ERD sample for Y4 previews, until Agil's attendance store and Zufar's screens are wired.
// Keep this separate from runtime attendance: opening a session never creates a check-in.
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
