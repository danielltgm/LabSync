# LabSync backend (Firebase, Sprint 3)

Project: `labsync-sprint2-dev` (Firestore `asia-southeast2`, Auth email/password). Replaces the Sprint 2 schema in `sprint-2-contract.md`.

## How it fits together

```
app (Expo, web + Android)
  reads   ── Firestore realtime subscriptions, scoped by firestore.rules
  writes  ── POST /api/act  { action, args }  + Firebase ID token
             └─ src/server/act.ts (Vercel function, firebase-admin)
                  load the docs the action touches → run shared logic (src/data/actions.ts)
                  → write changes + notifications + audit entry, in one transaction
  auth    ── email: Firebase directly · NIM: POST /api/auth/login → custom token
             register (praktikan): POST /api/auth/register
```

- The business logic lives once, in `src/data/actions.ts` (`(...args) => (draft) => result`), and runs on the server. The app never writes records itself.
- Exceptions, enforced by rules: your own `notifications/*.readAt`, your own `users/{nim}.navSlots`, and your own `quizAttempts/*.answers` while the attempt runs.
- **Auth uid = NIM/NIP.** Login accepts a NIM/NIP or an email. Praktikan register themselves. The koordinator creates asisten and koordinator accounts, and Firebase emails them a link to set their password.

## Collections

| Collection | Id | Contents | Who reads |
| --- | --- | --- | --- |
| `users` | NIM | `User` + `navSlots`, `createdAt` | self; everyone reads staff profiles; staff read all |
| `labs` | `lab-b` … | `Lab` (`photos` = ids in `labPhotos`) | signed in |
| `labPhotos` | sha256 prefix | `{ labId, dataUrl }` (JPEG ≤ 1024 px, about 150 kB) | signed in |
| `courses`, `classes`, `sessions`, `assignments` | | app types | signed in |
| `attendance` | `${sessionId}__${nim}` | `Attendance` + `classId`, `staffNims` | the student, class staff, koordinator |
| `leaves` | `${sessionId}__${nim}` | `LeaveRequest` + `classId`, `staffNims` | same |
| `checkinAttempts` | | `CheckInAttempt` + `classId`, `staffNims` | same |
| `grades` | `${assignmentId}__${nim}` | `{ assignmentId, nim, classId, score, staffNims }` | same |
| `quizAttempts` | `${quizId}__${nim}` | `QuizAttempt` + `classId`, `staffNims` | same |
| `quizzes` | | `Quiz` without answers + `staffNims` | opened/closed: signed in; drafts: staff |
| `quizKeys` | quiz id | `{ classId, staffNims, keys: { [qid]: { correct?, answerKey? } } }` | staff only |
| `notifications` | | `AppNotification` | the recipient |
| `log` | `log-0000001` … | `AuditEntry` + `staffNims`, hash-chained | koordinator; asisten for their classes |
| `sessionSecrets` | session id | `{ secret, classId, staffNims }` | staff only |
| `meta/auditHead` | | `{ lastId, hash }` of the newest log entry (the server chains onto it) | server only |

`staffNims` is the class's asisten at write time. When the koordinator changes a class's asisten, the server rewrites `staffNims` on all of that class's records, so the rules stay simple and list queries work.

Times are epoch milliseconds (numbers), the same as the app types.

## Security notes

- Check-in is evaluated on the server with the server clock (time window, radius, accuracy, mock location, QR).
- QR codes are signed with a random secret per session that students can't read. Location itself is still reported by the phone.
- The audit log is written only by the server and chained by hash. Clients can't write it (rules), and the koordinator's view verifies the whole chain.
- Quiz answer keys never reach students. Scoring happens on the server.

## Setup

1. Service account key: Firebase console → Project settings → Service accounts → Generate new private key. Save it as `.secrets/firebase-admin.json` (git-ignored).
2. `.env.local` (git-ignored):
   - `EXPO_PUBLIC_FIREBASE_*`: web app config (already there).
   - `FIREBASE_ADMIN_CREDENTIALS_BASE64`: base64 of the key JSON, used by the API routes.
   - `EXPO_PUBLIC_API_URL`: the deployed web app (for example `https://<vercel-domain>`). Native builds call the API there.
   - `INSTRUCTOR_AI_API_KEY` (optional): Gemini key for leave classification. Without it, keyword rules are used.
3. Vercel project env: the same `EXPO_PUBLIC_FIREBASE_*`, `FIREBASE_ADMIN_CREDENTIALS_BASE64`, `INSTRUCTOR_AI_API_KEY`.
4. EAS (APK): set `EXPO_PUBLIC_FIREBASE_*` and `EXPO_PUBLIC_API_URL` as EAS environment variables for the `preview` profile.
5. Rules: `firebase deploy --only firestore:rules,firestore:indexes --project labsync-sprint2-dev`.
6. Data: `npm run firebase:seed -- inspect | wipe --confirm | seed | verify` (see `scripts/seed-firebase.ts`). `verify` re-checks the whole audit chain.

## Demo mode

`EXPO_PUBLIC_DEMO_MODE=1` runs the app without Firebase: the store keeps the sample data (`src/data/demo-seed.ts`) in memory and runs the same shared actions on it, so every screen works and nothing is saved. Any password logs in; the login screen shows Praktikan / Asisten / Koordinator buttons, and on web `?as=praktikan|asisten|admin` starts signed in. Used for screenshots and showcases, for example:

```sh
EXPO_PUBLIC_DEMO_MODE=1 npx expo export --platform web
npx expo serve
```

Never set it in the Vercel or EAS production environment.

## Not done yet

- Push notifications (expo-notifications plus FCM credentials). Notifications currently land in the in-app inbox, with a toast while the app is open.
- Real-time quiz deadline enforcement on the server. The app submits at time-up; the server rejects late answers via rules (`deadline`).
