# LabSync

LabSync helps lab assistants manage practicum sessions and students track attendance and request leave. The app uses Expo Router and React Native, with Firebase Authentication for accounts and Cloud Firestore for shared data.

The Sprint 2 foundation supports sign-in and sign-out, schedules scoped to each account, and live session status. The existing recap and history screens read Firestore. Registration, practicum CRUD, attendance submission, and the leave flow are feature PRs for Sprint 2.

## Get started

Use Node.js 24 LTS (24.3 or newer), then run `npm ci` from the repo root.

| I want to… | Use |
| --- | --- |
| Demo with teammates or use Expo Go across networks | [Shared Firebase dev](#shared-firebase-dev) |
| Develop or test rules with disposable data | [Local Firebase emulators](#local-firebase-emulators) |

### Shared Firebase dev

1. Get the team's `.env.local` and a demo login from the PM.
2. Put `.env.local` next to `package.json`. It should point to `labsync-sprint2-dev` and set `EXPO_PUBLIC_FIREBASE_EMULATORS=false`.
3. Run `npm run web` for the browser or `npm start` and scan the QR code with Expo Go. Use `npx expo start --tunnel` if the phone cannot reach Metro over the local network.

The Expo environment file contains public Firebase client settings. Share demo passwords separately in a private channel. Keep Admin credentials and the instructor's AI secret out of Git and out of `EXPO_PUBLIC_*`. Teammates who need console access can ask the PM for an invite. [Firebase Console](https://console.firebase.google.com/project/labsync-sprint2-dev/overview)

### Local Firebase emulators

The Firestore emulator needs Java 21 or newer.

1. Copy [`.env.example`](.env.example) to `.env.local` and keep `EXPO_PUBLIC_FIREBASE_EMULATORS=true`.
2. Start Firebase in one terminal and leave it running.

   ```sh
   npm run firebase:emulators
   ```

3. Seed demo accounts and a session, then start Expo web in a second terminal.

   ```sh
   npm run firebase:seed
   npm run web
   ```

| Role | Local demo email | Local password |
| --- | --- | --- |
| Asisten | `assistant@labsync.example` | `labsync-local` |
| Praktikan | `student@labsync.example` | `labsync-local` |

For Expo Go on a physical phone, connect it to the same Wi-Fi as your computer. Bind the Auth and Firestore emulators to your computer's LAN IP in `firebase.json`, set that IP as `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST`, then restart the emulators and Expo. Set `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST` to the same IP with ports `9099` and `8080` when running the seed.

## Try the live session flow

1. Sign in as the assistant in one browser profile and as the student in another.
2. Open **Pemrograman Mobile** as the assistant. The student's schedule updates without refreshing.
3. Close the session as the assistant, then reload the student's page to confirm the status was saved.

Use the local emulator to repeat the demo from a fresh session. Stop and restart the emulators without importing data, then run `npm run firebase:seed` again. Seeding a running emulator preserves the session's current status.

## Run the checks

```sh
npm run lint
npx tsc --noEmit
npm run test:rules
```

`test:rules` starts its own Firestore emulator. Stop any emulator already using port `8080` first.

For the two-account browser smoke test, start fresh local emulators, run the seed, and open Expo web before running these commands. Set `LABSYNC_WEB_URL` if Expo uses a port other than `8081`.

```sh
npx playwright install chromium
npm run test:web
```

## Sprint 2 handoff

| Owner | Work |
| --- | --- |
| Daniel | SRS-01/02 · Registration, authorization, and practicum CRUD |
| Agiel | SRS-03/04 · Attendance submission, leave requests, and AI classification |
| Zufar | SRS-05/06 · Live recap and history, plus leave review |
| Team with PM | SRS-07 · Integration and acceptance testing |

Use the [Sprint 2 contract](docs/sprint-2-contract.md) for Firestore paths, access rules, and the leave classification API. The instructor's endpoint, authentication method, and response format are still pending.

The PM can seed the shared dev project with Application Default Credentials and `node scripts/seed-firebase.cjs labsync-sprint2-dev`. Save any newly generated dev passwords privately. Rerunning the seed preserves existing passwords and session status.
