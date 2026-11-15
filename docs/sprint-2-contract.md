# Sprint 2 foundation

Firebase Auth is the source of UID. Firestore stores profiles, classes, sessions, attendance, and leave. Students can register from the app. The PM provisions or upgrades assistant profiles through trusted Admin access.

## Firestore

| Path | Document fields | Read access |
| --- | --- | --- |
| `users/{uid}` | `name`, `identifier` (NIM or assistant code), `role` (`ASISTEN` or the Sprint 1 enum value `PRAKTISAN`) | Own profile |
| `classes/{classId}` | `name`, `assistantUid` | Enrolled student by ID, assigned assistant by ID or scoped query |
| `enrollments/{uid}/classes/{classId}` | `enrolledAt` | Student's own enrollment list |
| `sessions/{sessionId}` | `classId`, `courseName`, `className`, `labRoom`, `date` (YYYY-MM-DD), `startTime` and `endTime` (HH:mm, Jakarta), `assistantName`, `status` | Enrolled students and assigned assistant |
| `attendance/{sessionId}__{uid}` | `sessionId`, `classId`, `studentUid`, `studentId` (NIM), `studentName`, `className`, `checkedInAt` (server timestamp), optional `notes` | Owning student and assigned assistant |
| `leaveRequests/{sessionId}__{uid}` | `sessionId`, `classId`, `studentUid`, `reason`, `submittedAt`, `classification`, `decision`, optional `studentName`, `studentId`, `reviewedBy`, and `reviewedAt` | Owning student and assigned assistant |

Assistant class discovery filters by `assistantUid == auth.uid`. Session listeners filter by one `classId` at a time. History filters by `studentUid == auth.uid`. Assistant recap and leave queues filter by `classId`, with `sessionId` when targeting a specific session. Add composite indexes alongside any new compound ordering and smoke-test them on shared dev.

Assigned assistants can manage their classes and update scheduled sessions. Session status advances from `TERJADWAL` to `DIBUKA` to `SELESAI`. Attendance uses a transaction and a deterministic document ID. Firestore checks enrollment, identity, and session status before accepting the first record.

## Class participants

The class management screen loads participants from `GET /api/classes/{classId}/participants`. It uses the Firebase ID token of the assigned assistant. The server returns a paginated directory of registered students with only UID, name, NIM and membership in that class. The screen filters loaded names or NIMs and can request an exact NIM across the directory.

Membership stays in `enrollments/{uid}/classes/{classId}` and uses the existing Firestore write rules. No migration is needed for classes already created. Shared dev requires Firebase Admin credentials on the Expo server.

## AI classification contract

The app creates the leave with `classification.status = 'pending'` and `decision = 'pending'`. It calls `POST /api/leave-requests/{requestId}/classify` without a request body and with a Firebase ID token in the Authorization header. The server verifies ownership, reads the stored reason, and sends only that text to the Gemini API. Server-only env uses `INSTRUCTOR_AI_API_KEY` and optional `INSTRUCTOR_AI_MODEL`.

The server saves `{ status: 'classified', category }` or `{ status: 'unavailable' }`. The student client cannot write the category. A short server-side lease prevents duplicate model calls for overlapping requests. The assistant can still review and record a decision while classification runs, or when Gemini fails. In emulator mode with an empty key, the server can return a keyword category prefixed with `Demo:`.

## Handoff

| Owner | Scope |
| --- | --- |
| Daniel | SRS-01/02 registration, role provisioning, class/enrollment/session CRUD and matching rules |
| Agiel | SRS-03/04 attendance transaction, leave submission and AI adapter |
| Zufar | SRS-05/06 rekap/history and leave review, including loading/error behavior |
| Team with PM | SRS-07 two-account demo, permission checks, and integration testing |

The acceptance demo opens a session as assistant, submits attendance as a student, checks the live recap and persistence, then closes the session. The second demo submits leave, shows classification, records an assistant decision, and verifies the student's updated status. Test unauthorized class access, duplicate attendance, closed sessions, and an AI timeout.
