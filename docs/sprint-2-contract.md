# Sprint 2 foundation

Firebase Auth is the source of UID. Firestore is the source of user roles, memberships, session state, attendance, and leave requests. Use the TypeScript contracts in [src/types/sprint2.ts](../src/types/sprint2.ts). The foundation provides seeded account login/logout, scoped session and attendance reads, and live open/close status. Registration, data-management UI, presensi submission, and leave actions are feature PRs.

## Firestore

| Path | Document fields | Read access in this scaffold |
| --- | --- | --- |
| `users/{uid}` | `name`, `identifier` (NIM or assistant code), `role` (`ASISTEN` or the Sprint 1 enum value `PRAKTISAN`) | Own profile |
| `classes/{classId}` | `name`, `assistantUid` | Enrolled student by ID, assigned assistant by ID or scoped query |
| `enrollments/{uid}/classes/{classId}` | `enrolledAt` | Student's own enrollment list |
| `sessions/{sessionId}` | `classId`, `courseName`, `className`, `labRoom`, `date` (YYYY-MM-DD), `startTime` and `endTime` (HH:mm, Jakarta), `assistantName`, `status` | Enrolled students and assigned assistant |
| `attendance/{sessionId}__{uid}` | `sessionId`, `classId`, `studentUid`, `studentId` (NIM), `studentName`, `className`, `checkedInAt` (server timestamp), optional `notes` | Owning student and assigned assistant |
| `leaveRequests/{sessionId}__{uid}` | `sessionId`, `classId`, `studentUid`, `reason`, `submittedAt`, `classification`, `decision`, optional `reviewedBy` and `reviewedAt` | Owning student and assigned assistant |

Assistant class discovery filters by `assistantUid == auth.uid`. Session listeners filter by one `classId` at a time. History filters by `studentUid == auth.uid`. Assistant recap and leave queues filter by `classId`, with `sessionId` when targeting a specific session. Add composite indexes alongside any new compound ordering and smoke-test them on shared dev.

The scaffold permits the assigned assistant to update only session status in this order: `TERJADWAL → DIBUKA → SELESAI`. Other client writes are denied until the corresponding module supplies validation and rules tests. For attendance, use the deterministic document path and an online transaction to check that the session is open and the record is absent, then create one record. Use Firestore-generated session IDs so the two ID parts are unambiguous. The matching create rule must verify UID, enrollment, session status, and class. Preserve the original attendance on repeat submissions. Keep identity/role assignment and demo data seeding in trusted code.

## AI classification contract

App-facing interface is `ClassifyLeaveReason({ reason }) → { category }`. For integration with Firestore, the app should request classification for its own stored leave request through an authenticated server. The proposed endpoint is `POST /leave-requests/{requestId}/classify` with a Firebase ID token in `Authorization: Bearer <token>`. The request has no body. A successful response includes `{ category }`; an upstream failure returns a retriable error and leaves the request available for review. The server loads the saved reason and forwards only that reason to the instructor API. It saves `classification` as `{ status: 'classified', category }`, or `{ status: 'unavailable' }` on failure. New requests start with `classification: { status: 'pending' }` and `decision: 'pending'`. The assigned assistant changes the decision independently and records reviewer UID and timestamp. The endpoint, authentication method, and category list for the instructor's API are pending. A local stub can implement the TypeScript interface while Agiel works on the flow.

## Handoff

| Owner | Scope |
| --- | --- |
| Daniel | SRS-01/02 registration, role provisioning, class/enrollment/session CRUD and matching rules |
| Agiel | SRS-03/04 attendance transaction, leave submission and AI adapter |
| Zufar | SRS-05/06 rekap/history and leave review, including loading/error behavior |
| Team with PM | SRS-07 two-account demo, permission checks, and integration testing |

The acceptance demo opens a session as assistant, submits attendance as a student, checks the live recap and persistence, then closes the session. The second demo submits leave, shows classification, records an assistant decision, and verifies the student's updated status. Test unauthorized class access, duplicate attendance, closed sessions, and an AI timeout.
