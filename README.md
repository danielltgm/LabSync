# LabSync

LabSync is an Expo Router app for managing lab sessions, attendance, and leave requests. The Sprint 2 foundation connects the existing LabSync screens to Firebase Authentication and Firestore.

## Local setup

Use Node.js 22.13+ or 24.3+ and Java 21+ for the Firestore emulator.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Run `npm run firebase:emulators` in one terminal.
4. Run `npm run firebase:seed` in another terminal.
5. Run `npm start` and press `w` for web or scan the QR code with Expo Go.

The local accounts are `assistant@labsync.example` and `student@labsync.example`. Both use `labsync-local` on the emulator. Open the same session in two browser profiles to see status changes without refreshing. The seed keeps any existing session status. To start over locally, restart the emulators without imported data and run the seed again.

On a physical device, set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` to your computer's LAN address and restart Expo. The emulator defaults to loopback. For a LAN-only emulator session, bind the Auth and Firestore emulators to your computer's LAN address in your local Firebase config. Use the shared dev project for Expo Go across networks.

## Shared Firebase dev

Project ID is `labsync-sprint2-dev`. Ask the PM for project access, then copy the web app settings from the [Firebase Console](https://console.firebase.google.com/project/labsync-sprint2-dev/settings/general) into `.env.local` and set `EXPO_PUBLIC_FIREBASE_EMULATORS=false`. Expo embeds these client settings in the app. Keep account passwords, Admin credentials, and the instructor's AI secret out of the repo and out of `EXPO_PUBLIC_*`.

The PM can seed the dev project with Application Default Credentials and `node scripts/seed-firebase.cjs labsync-sprint2-dev`. Save the generated dev passwords securely. Subsequent runs preserve passwords and session status.

## Checks

Run `npm run lint`, `npx tsc --noEmit`, and `npm run test:rules`. The rules test starts its own emulator, so stop any running Firestore emulator on port 8080 first.

For the browser smoke test, start with freshly seeded emulators and Expo web running. Run `npx playwright install chromium` once, then `npm run test:web`. Set `LABSYNC_WEB_URL` if Expo uses a different port.

See the [Sprint 2 contracts and handoff](docs/sprint-2-contract.md) for schema, access, and feature ownership.
