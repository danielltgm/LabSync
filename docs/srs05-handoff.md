# SRS-05 — Rekap dan riwayat real-time

Owner: Muhammad Hafidh Zufar Dewantara. Based on `main` at `cd9e433`.

- Preserve existing Firestore listeners and scoped queries: history by authenticated UID, recap by class and session.
- Filter personal history by UID, including records created before a NIM change. Sort using the original server timestamp even when session metadata is unavailable.
- Handle unresolved server timestamps without crashing; display `Menunggu sinkronisasi` until acknowledged.
- Hide misleading zero totals during loading/errors. Add a retry action for attendance and session reads, and ignore callbacks from disposed attendance listeners.
- Leave the Sprint 1 attendance payload unchanged. Live read metadata is in `src/types/attendance-view.ts`.

Validation: `npm run lint`, `npx tsc --noEmit`, and `node --test tests/attendance-view.test.cjs` passed. Full browser integration is exercised with the SRS-06 emulator test.

No cloud rules, data, or account configuration has been changed. Firebase client config does not grant Firebase CLI administrator access; database edition and shared-dev deployment require the PM's authenticated environment. Local tests use the existing emulator and Core operations used by the foundation.
