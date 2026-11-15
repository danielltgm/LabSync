# SRS-06 — Review izin dan keputusan asisten

Owner: Muhammad Hafidh Zufar Dewantara. Feature branch: `feat/srs06-leave-review`.
This branch is stacked on `feat/srs05-live-attendance`; review the SRS-05 commit first.

## Delivered behavior

- Assistant: open a session's recap, choose **Review izin sesi ini**, read the reason and classification, confirm **Terima izin** or **Tolak izin**. Filter pending requests or view all decisions.
- Student: open **Status Izin Saya** to see only their own requests and live decisions. The role guards also apply to direct URLs.
- Each decision is an online Firestore transaction. It rereads `pending`, writes only `decision`, `reviewedBy` and a server-generated `reviewedAt`, and prevents overwrite/replay after a final decision. The UI blocks repeated submits while saving.
- Pending/unavailable classification is displayed explicitly. No category or decision is invented. AI does not approve/reject requests.
- Both lists distinguish loading, empty data and read failures. Retry creates a new subscription. Old subscriptions are disposed; changing account/session does not reuse another scope's records.
- Small-screen layout uses the existing React Native styles, SafeArea and scrollable confirmation dialog. Long names and reasons wrap. A cancelled confirmation keeps its last content during the dismissal animation.

## Contract and integration boundaries

Source contract: `docs/sprint-2-contract.md`, `src/types/sprint2.ts` and the README ownership table. `docs/srs.md` and `docs/programmer.md` still describe Sprint 1; no separate Sprint 2 acceptance document was supplied.

SRS-03/04 belongs to Agiel. This feature reads existing leave documents and does not implement student submissions or the instructor API. Emulator tests provision records through Admin SDK only to exercise the consumer independently.

Optional `studentName` and `studentId` snapshots are supported without reading other users' private `users` documents. Older requests without them display a truthful identity-unavailable fallback. The submission module should copy and validate the authenticated student's name/NIM when creating the request. It must preserve the deterministic `sessionId__uid` document ID.

Rules assumptions: pending decisions become approved/rejected once; final decisions cannot be edited by this UI. Review remains possible after a session closes. A request must reference an existing session in the same class. Reason length is 1–4000 characters, category 1–120, optional name 1–200 and optional NIM 1–40. No client create/delete permission was added. Student attendance/leave creation rules remain the respective owners' responsibility.

Queries use equality filters by `studentUid` or `classId` + `sessionId`. Sorting uses timestamps on the client; no new compound `orderBy` or composite index is introduced. Validate against the shared dev instance before deployment. Its edition could not be fetched because Firebase CLI is not authenticated; the existing Core SDK and Standard emulator were used without provisioning any cloud resources.

## Run locally

Use Node 24.12+ (tested with 24.22.3) and Java 21+ for emulators.

For the shared dev environment: copy the PM's `.env.local` next to `package.json`, run `npm ci`, then `npm run web`. PM supplies demo-account passwords separately. The env file is ignored by Git and is not included in deliverable archives.

For isolated tests, use `.env.example` as `.env.local` (emulator mode), then:

```powershell
npm ci
npm run lint
npx tsc --noEmit
npm run test:views
npm run test:rules
```

`test:rules` starts its own Firestore emulator. Do not leave a second emulator on port 8080. The suite tests the actual production review transaction, including two concurrent decisions.

For browser tests, start `npm run firebase:emulators` in one terminal. In another:

```powershell
$env:EXPO_PUBLIC_FIREBASE_EMULATORS = 'true'
npm run firebase:seed
npx expo export --platform web
npx expo serve --port 18765
```

In a third terminal, install Chromium once (`npx playwright install chromium`), then:

```powershell
$env:LABSYNC_WEB_URL = 'http://localhost:18765'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
# Optional on Windows when using installed Edge instead of Chromium:
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:srs05-06
```

Run these browser tests serially, without other tests or manual sessions on the same emulator. They reset their demo fixtures and temporarily install denied-read rules to test error recovery; the original rules are restored in `finally`. Host assertions prevent fixture writes to cloud Firebase.

The original `npm run test:web` smoke test expects a newly seeded emulator with no attendance and its session still `TERJADWAL`; run it before `test:srs05-06` or restart emulators without importing data, then seed.

## Validation and review

| Check | Result |
| --- | --- |
| `npm run lint` / `npx tsc --noEmit` | Passed |
| `npm run test:views` | 4 tests passed |
| `npm run test:rules` | 37 tests passed, including subtests |
| `npm run test:web` | 1 original two-account smoke test passed |
| `npm run test:srs05-06` | 8 tests passed, including subtests |
| `npx expo export --platform web` | Passed; production output tested |
| `git diff --check` | Passed |

Validated on the web production export in Edge, at 360×800, 360×500 and 1280×900. Android/iOS device behavior still needs a device smoke test. No cloud deployment, shared-dev write, push or merge was performed.

The rules suite covers query permissions, student/unrelated/anonymous denial, profile escalation, field/identity/classification tampering, overlong values, missing fields, timestamps, final-state replay, mismatched/orphaned session references and competing transactions. Existing session status transitions remain covered. Numeric counters/arrays are not added by this feature; client creation is denied rather than opened by this work.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for class-scoped assistant review by restricting changes to a pending request's decision, authenticated reviewer and server timestamp while keeping identity, reason and AI results immutable. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

PM should review the rules diff together with Agiel's eventual submission rules before deploying to `labsync-sprint2-dev`. Existing shared-dev rules do not yet permit this decision write. Do not replace the shared rules without reconciling any newer team changes.
