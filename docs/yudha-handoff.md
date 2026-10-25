# yudha: y2-y4 handoff

> historical standalone-stage notes. see [integration-handoff.md](integration-handoff.md) for the connected team flow.

## scope

- y2: controlled role/identity switcher, including a missing-student state.
- y3: session cards and confirmation-based open/close controls. finished sessions cannot reopen.
- y4: home, root stack navigation, and an in-memory provider seeded from `docs/erd.md`.
- session transitions check the current role, assistant identity, session id and latest status in the reducer.
- role changes and navigation keep session state; reload resets the demo.

## dummy data and temporary screens

`src/constants/dummy-data.ts` supplies users and sessions. these are sprint 1 runtime seeds, with no backend or disk persistence.

`src/constants/preview-attendance.ts` supplies one read-only attendance example. it is separate from the session store and never changes when a session opens or closes. no new check-in is created by this branch.

home currently navigates to `/preview/rekap/[id]` and `/preview/history`. both screens are visibly labeled as dummy previews, enforce role visibility and handle empty data. assistants can open/close their session from the recap preview too.

the praktikan footer in home is temporary. scheduled/closed sessions and the seeded already-present identity have disabled buttons. the active check-in button explains that the form is not connected yet; it never reports a successful submission.

## integration next

1. bring in agil's shared attendance contract and implement the runtime attendance action with the status/role/duplicate checks at the state layer.
2. replace home's temporary praktikan footer with agil's `SessionPraktikanCard`, form and feedback components.
3. connect zufar's final `/rekap/[id]` and `/history` screens to the shared context, then change home's navigation targets and remove the preview routes/data/component.
4. reuse `SessionControlAction` in the final recap screen so the srs close-from-recap flow stays available.
5. run the complete five-stage srs demo after integration. this branch covers yudha's standalone tasks, not the completed team attendance flow.

no agil/zufar-owned component or final screen is added or edited here.

## verification

- `npm run test:state`: covers transition ordering, terminal close, stale/duplicate actions, role guards, assistant ownership, identity preservation and empty seeds.
- `npx tsc --noEmit` and `npx expo lint`.
- mobile web checks at 360px; android/ios device verification remains for the integration pass.

## pull request order

merge y1, then y2, y3 and y4. each later pr targets the preceding feature branch to keep its diff focused. retarget the next pr to `main` after its dependency is merged; squash/rebase merges may require rebasing the remaining branches.
