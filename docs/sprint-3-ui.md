# Sprint 3 UI overhaul

Branch `feat/ui-overhaul`. The UI runs end to end on an in-memory demo backend
(`src/data/store.tsx`), so every flow can be clicked through on web before Firebase is wired.

## Stack

- **React Native Reusables** (shadcn port, copied into `src/components/ui`) on **Uniwind** (Tailwind v4).
  Add components with `npx @react-native-reusables/cli@latest add <name> --styling-library uniwind`.
- Theme tokens live in `src/global.css` (light and dark). Raw hex mirrors for maps, QR and the nav theme live in `src/lib/theme.ts`.
- App-level components are in `src/components/app`. Maps are in `src/components/map`: Leaflet on web, `expo-maps` on native.
- `experiments.typedRoutes` is off. On Windows the generator drops every route inside the `(app)` group.

## Look ("poster" style)

- Palette: sage canvas, cream cards, charcoal `ink` blocks, plus four loud accents: `coral`, `violet`, `mustard`, `aqua` (and `sage`). Text on coral, mustard, aqua and sage uses `text-on-bright`; text on violet is white.
- Fonts (loaded in `src/lib/fonts.ts`): `font-display` is Barlow Condensed, set in caps for titles and big numbers. `font-sans` is Space Grotesk, the default for body text. `font-mono` is Space Mono, used for chips, times and codes.
- `TONE_CLASSES[tone].bright/onBright` give the loud block version of a status tone. Use `StatTile bright` for colored stat blocks.
- Mascot: `Labi`, a retro CRT computer with a map-pin antenna (`src/components/app/mascot.tsx`). See `docs/art-prompts.md` for the poses and moods.
- `alarm` is a hard red for "no" states (outside the radius, mock location). Coral stays the friendly brand accent.
- The mascot PNGs carry a cream sticker edge (added by `scripts/cut-mascot.py`), so the black outlines read on ink cards, in dark mode and on the dark splash.
- Keyboard: Android is edge-to-edge, so the window never resizes for the keyboard. `Screen` scrolls with `KeyboardAwareScrollView` and dialogs sit in a `KeyboardAvoidingView`, both from `react-native-keyboard-controller` (needs a dev build or APK, not Expo Go). Use `SearchField` for search boxes; absolutely positioned icons inside inputs misalign on native.
- Android builds without a Google Maps API key render the map with Leaflet/OpenStreetMap in a WebView (`src/components/map/leaflet-webview.tsx`). Google Maps on Android crashes without a key.

## Responsive (tablets)

`useLayout()` (`src/hooks/use-layout.ts`) gives the breakpoints:

- **< 768**: phone. Floating bottom bar, one column.
- **≥ 768** (`wide`): the bottom bar becomes a vertical rail on the left (`RAIL_SPACE`), tab screens keep clear of it, and card lists (`Grid`) go two-up.
- **≥ 960** (`split`): dashboards (`Columns`) split into a main and a side column: home for every role, profil, QR Sesi. The check-in panel puts the radar beside the checklist from 768.
- **≥ 1180**: `Grid` goes three-up.

`Screen width="narrow" | "medium" | "wide"` caps the content column on big screens (forms narrow, lists medium, dashboards wide). Tab roots default to wide, pushed pages to narrow. Use `Column` for custom headers so they line up.

`app.json` locks phones to portrait; Android 16+ ignores that lock on large screens, so tablets rotate and use the landscape layout.

## Builds (EAS)

- Project: `@myudak/LabSync`. Android package: `com.myudak.labsync`.
- `npx eas-cli@latest build -p android --profile preview` builds an installable `.apk` (internal distribution).
- `production` builds an `.aab` for the Play Store. Versions are managed remotely by EAS (`appVersionSource: remote`).
- Dev quirk (web): Uniwind only regenerates CSS classes when `src/global.css` changes. If a new class doesn't apply during hot reload, bump the `rev` comment in `global.css`.

## Navigation

`src/app/(app)/(tabs)` uses headless `expo-router/ui` tabs with a floating bar (a side rail on tablets). The bar is **Beranda · 3 slots · Profil**: Beranda and Profil are fixed (Profil always far right), the 3 middle slots are the user's choice and the middle one gets the big button (`useNavSlots` in `src/data/nav.ts`, saved per user in `navPrefs`).

| Role | Default slots | Can pick from |
| --- | --- | --- |
| Praktikan | Jadwal, **Presensi**, Kelas | Jadwal, Presensi, Kelas, Izin, Peta |
| Asisten | Jadwal, **Presensi**, Kelas | + Log |
| Koordinator | Kelas, **Pengguna**, Log | Jadwal, Presensi, Kelas, Izin, Pengguna, Peta, Log |

Customize from Beranda → Pintasan → "Atur bottom bar", or Profil → Bottom bar. On tablets / desktop the bar can sit as a rail on the **left** (default) or **right**, or as a labelled **bottom** bar ("Posisi di tablet"; a per-device pref `barPlacement` in `use-prefs`, read via `useBarPlacement`; `useTabInsets` pads content on the matching side). Phones always use the bottom bar. **Pintasan** on Beranda lists every feature that is not in the bar (plus actions like Ajukan izin, Pertemuan baru, Kelas baru), so nothing is hidden.
Beranda shows who is signed in: a role badge (Praktikan coral, Asisten violet, Koordinator mustard, same as the login demo cards) and an avatar ring in that colour.
Every tab route stays registered (hidden triggers render nothing), so links like `router.push('/peta')` work for any role.
The selected tab's aqua circle is its own `rounded-full` view: a style-only `borderRadius` came out square on Android.
Pushed screens: `sesi/[id]`, `presensi/[id]`, `scan`, `qr/[id]`, `rekap/[id]`, `izin/[id]`, `izin/baru`, `notifikasi`, `riwayat`, `kelas/[id]`, `kelas/baru`, `sesi/baru`, `sesi/[id]/edit`, `lab/*`, `kuis/baru`, `kuis/[id]`, `kuis/[id]/edit`, `kuis/[id]/kerjakan`.

## Classes, grading, pickers

- **Koordinator** creates classes at `kelas/baru`: course (or a new one), class label, lab (warns on a lab/time clash), first meeting date + time, duration, number of weekly meetings, asisten and praktikan. All meetings are generated at once (`createClass`). The Kelas tab lists every class with its asisten, a course filter, and a warning for classes without asisten. Beranda shows "Perlu perhatian" (no asisten, low attendance, nothing graded).
- **Class page** (`kelas/[id]`), staff: Pertemuan, Anggota (praktikan + asisten; koordinator assigns asisten), Matriks, Nilai. Praktikan get their own view: their status per meeting, their scores and final grade, the class asisten.
- **Nilai** (`components/app/grade-book.tsx`): rows are students, columns are weighted items (tap a header to rename, reweight or delete). Typing only edits a draft; Enter moves down a row; "Simpan" lists every changed score for confirmation. Final = weighted average over items that have any score (missing score on a graded item counts 0), with a letter grade. Changing an already-saved score requires a reason (logged). Export: "Export nilai kelas (.xlsx)" with sheets Nilai and Komponen. Data: `assignments` + `grades` in the demo state (`DEMO_VERSION` 6).
- **People search** (`PeoplePicker` in `components/app/pickers.tsx`): type a name or NIM, Enter adds the top match; NIMs typed or pasted with spaces/commas/new lines are added one by one; unknown NIMs can be added for praktikan.
- **Date and time** use `DateField` (month calendar) and `TimeField` (lab slots, hour and minute grids) instead of typed text. `MonthCalendar` is also the Jadwal month view: tap or drag the handle under the date strip; on landscape tablets the month stays open beside the day.
- **Confirm before changing records** (`useConfirm` in `components/app/confirm.tsx`, shows "from → to"): attendance overrides, leave decisions (now changeable after the fact, attendance follows), role changes, asisten assignment, class membership, schedule edits, grade saves and column edits.

## Pertemuan content

- Create and edit share one form: topic, **keterangan** with light formatting (toolbar: Normal, Judul `# `, Daftar `- `, Kecil `~ `, Tebal `**…**`, plus preview; rendered by `RichText` in `components/app/rich-text.tsx`), and **materi** links (name + URL, suggestions, URL check).
- Open or finished meetings can still edit topic, keterangan and materi ("Ubah isi & materi"); time and lab are only editable while scheduled, and only schedule changes notify students and require a reason.

## Quiz (kuis) in a pertemuan

- Asisten adds a quiz from the pertemuan page: multiple choice (auto-graded) and short answer (optional key with `|` alternatives, otherwise graded by hand), points per question, duration, shuffle, "wajib presensi", warning limit (default 3), and an optional link to the grade book (`Kuis P{n}` column with a weight). Drafts are editable; once opened, questions are fixed.
- Students take it in a **locked screen** (`kuis/[id]/kerjakan`): screenshots/recording blocked (`expo-screen-capture`, native), leaving the app counts as a warning (AppState), screenshot attempts count where the OS reports them, web counts tab/window switches (blur over 1 s, or a hidden tab) and leaving full screen, and blocks copy/cut/paste/context menu. Back button and swipe-back ask to submit instead. Warning 1..N shows a dialog; the next one submits automatically. Answers save as you go; time up submits.
- Staff page (`kuis/[id]`): open/close (closing submits everyone still working), live participants with warnings and time left, "Izinkan masuk lagi" (+1 chance, at least 5 minutes, reason required), short-answer grading (0 / half / full), and the question list with keys. The final score (percent) goes into the linked grade column once nothing is left to grade.
- Limits: Android split-screen/floating windows and the notification shade don't change AppState, so they aren't detected; a full lock (screen pinning) needs a small native module.

## Audit log

- Every staff change is appended to `log` (`src/data/audit.ts`): who, role, when, kind, class, subject, from → to, reason. Entries are hash-chained; `verifyLog` finds any edited or removed entry and the UI shows "Rantai log rusak" from that point.
- Asisten: "Riwayat" tab on each class, and the Log tab for all their classes. Koordinator: Log tab for everything, with filters, search and Excel export.
- Demo caveat: the log lives on the device; real immutability comes from Firestore rules (create-only `auditLog`, written by the server).

## Rooms

- Labs are the real rooms: **Lab Informatika B, C, D**, Gedung E FSM UNDIP lantai 2. All three share the Gedung E reference point (Plus Code 6P4GXC2R+P82, -7.0482375, 110.440765625) because precise per-room coordinates aren't available, so GPS proves "in Gedung E", not which room; the QR in the room proves the room. Capacity and facilities are placeholders until the koordinator fills them in.
- Room photos (cover + gallery, max 8, camera or gallery, reorder, set cover), directions text, and editable facilities (`lab/[id]/edit`). Photos show on the lab page, the map card and the pertemuan "Ruangan" section.
- The map merges labs on the same point into one pin ("B+2"); tapping cycles B → C → D.

## Sharing and class page

- **Bagikan** on every pertemuan and kelas page (all roles), and right after creating a pertemuan. The pop-up has a preview and two modes: **Gambar + teks** (a poster card captured with `react-native-view-shot`, `html2canvas-pro` on web; native shares the PNG through the share sheet and copies the caption, web uses Web Share or downloads the PNG) and **Teks saja** (editable message → WhatsApp, X (short version), Telegram, Salin, Lainnya). Builders in `src/lib/share.ts`; only class info is shared (no attendance or grades). Links back to the app use the web origin, or `EXPO_PUBLIC_WEB_URL` on native.
- Class page: **schedule card** (weekly slot, room, live/next meeting with countdown, next two) and **Tautan kelas** (WhatsApp group, Drive, forms…; staff edit, logged). The pertemuan page links straight to its class.

## Demo mode

- The login screen has quick accounts: Praktikan, Asisten, Koordinator. Profil → Mode demo switches accounts and resets data.
- The "Simulasi lokasi" picker fakes GPS states: inside, edge, outside, far, weak, mock, denied, services off. It is on by default on web.
- Data persists in AsyncStorage (localStorage on web). It reseeds after 3 hours so a live session always exists.

## Leave (izin) category

Per the Sprint 2 contract the student only writes a reason; the AI sets the category (`Sakit`, `Keluarga`, `Akademik`, `Transportasi / Kendala`, `Lainnya`) and the assistant decides. The demo store runs the same keyword fallback as the server (`classifyByKeywords`). Status steps: Diajukan → Dikategorikan AI → Ditinjau asisten → Disetujui/Ditolak.

## PM feedback mapping

| Feedback | Where |
| --- | --- |
| UID pakai NIM | `User.nim` is the key everywhere. Login is NIM + password. Attendance and leave IDs are `{sessionId}__{nim}`. |
| Keterangan, nama sesi rancu | Sessions have `meetingNo`, `topic`, `description`, `materials`, `changeNote`. Titles read "Course · Kelas E" and "Pertemuan 8 · Topic". |
| UI masih slop | Full redesign: RNR + Uniwind, hero card plus timeline agenda, dark mode. |
| Rute kejauhan | Tabs with center QR. Attendance takes 1 tap from anywhere. |
| Validasi waktu server | `src/lib/attendance-rules.ts` checks a time window (15 min early to session end) against `serverNow`. `useNow` exposes a server offset. |
| Nambah asprak nembak DB | `SUPERADMIN` role with an `/admin` console: promote, add assistants, assign them to classes, handle access requests. |

## Backend wiring TODO (Firebase)

1. **Identity**: `POST /api/register` creates the Auth user with `uid = NIM` (Admin SDK). The client signs in with a synthetic email or a custom token.
2. **Collections**: `labs`, plus extended `sessions` fields (`labId`, `meetingNo`, `topic`, `description`, `startsAt`, `endsAt`, `lateAfterMin`, `materials`, `changeNote`), `attendance.status/method/distanceM/accuracyM`, `checkInAttempts`, `notifications/{nim}/items`, `users/{nim}/devices`.
3. **Check-in API**: `POST /api/attendance/check-in` runs `evaluateCheckIn` with the server clock and an HMAC QR secret. Firestore rules then deny client-side attendance creates.
4. **Mutations that notify**: open/close session, update schedule and review leave move to API routes that write, then fan out via the Expo Push Service and the inbox.
5. **Push**: `expo-notifications` (needs a dev build). Store Expo push tokens per device and honor the per-user prefs in `use-prefs`.
6. **Export on native**: done client-side (`write-excel-file/universal` bytes → `expo-file-system` → `expo-sharing` share sheet). Very large sheets (over ~160 kB per file) would need fflate's worker path, which React Native lacks; move those to the server if it ever matters.
9. **Audit log**: `auditLog` collection, create-only rules, entries written by API routes (not the client) so the hash chain can't be forged.
10. **Quiz**: attempts and violations written through an API route with the server clock; deadlines enforced server-side. Room photos go to Firebase Storage.
7. **Maps on native**: add `android.config.googleMaps.apiKey` and build a dev client (`eas build --profile development`).
8. **Rules**: allow signed-in reads of session summaries (map activity) and lab docs. Writes to `labs` are assistant/superadmin only.
