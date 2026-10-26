# v0.1.3 validation status

Source preview, not a deployed or signed release.

## Verified in this refactor

- Full desktop TypeScript typecheck passed in a separate Windows worktree at the pinned upstream commit.
- Targeted Vitest UI/history suite: **48 tests passed across 5 files**. Includes 6 new deduplication hook/component cases, 9 dotted-row tests, 13 existing session-row tests, 12 history tests and 8 delegation-card tests.
- Dependency-free project suite: **18 tests passed**, including 7 new pure deduplication cases.
- Plugin and patch-script syntax checks passed.
- All **19 overlay files** were checked, applied, checked again, reverted and checked against the actual pinned upstream source. Updated source checksum manifest and unified patch were generated from that source.
- Owner-guard mutation check: deliberately removing owner isolation caused the cross-connection and cross-profile tests to fail. The mutant was not shipped.
- Source scan before initial publication found no credential, private-key, private-IP or personalized Windows-path matches.

## What changed

The dotted-row renderer and ordinary-session filter now share `selectParentSubagents`. The list filter requires an exact child transcript/lineage ID and matching connection/profile. Filtering happens before branch flattening, grouping and virtualization in all four section rendering paths. Collapsing the dotted group does not reveal the duplicate tree row. Plugin disable restores ordinary rows. Child-only search lists and unrelated sessions remain accessible.

Terminal children leave the dotted live group. Saved sessions are not deleted or globally hidden and can remain in the ordinary history list once no dotted row represents them.

## Build verification

- The additional `sessions-section` regression test run passed, followed by the isolated desktop renderer/main/preload build and `assert-dist-built` integrity check (exit 0).

## Open
- No packaged v0.1.3 installer or signed release has been produced.
- No running GUI was stopped/replaced. Live installed-app visual acceptance remains pending.
- Historical completed cards without exact saved mappings remain a separate unresolved issue. The separate backend/frontend contract candidate is not silently included as a completed fix.
- Long-list performance, extended offline/reconnect behavior and real OS window counts remain unverified.

## Test limitations

The UI suite exercises real React components/hooks with controlled stores and mocked navigation/snapshot bridges; it does not prove a real installed Electron window loaded the changes. Node emitted an experimental localStorage warning, and existing session-row tests emitted React `act(...)` warnings; all listed assertions passed.
