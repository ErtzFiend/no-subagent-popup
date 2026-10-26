# No Subagent Popup

A version-checked Hermes Desktop refactor with a companion desktop plugin.

> **v0.1.3 source preview — not a verified installed release.** Duplicate live-child tree rows are filtered while preserving the dotted entries. Typechecking, 48 UI/history tests, 18 project tests and source apply/revert checks passed. The isolated desktop renderer/main/preload build and post-build integrity check passed. Your running app has not been replaced. Historical completed cards without saved child-session links remain unresolved.

Project: https://github.com/ErtzFiend/no-subagent-popup (private development repository).

## Intended behavior

- Live (`running` or `queued`) delegated children appear in collapsible dropdowns immediately beneath their own parent in the main Sessions sidebar.
- While a live child has a dotted entry under a parent in the same list, its duplicate ordinary tree row is suppressed. Matching requires exact child transcript identity and the same connection/profile; orphaned search results and unrelated sessions are retained.
- Completed, failed and interrupted children leave the dotted live group automatically. Their saved session/history remains accessible through the normal session list where available.
- Clicking either a sidebar child or an existing delegation card opens the child's transcript **in the current pane/window**.
- Child viewing remains **read-only**: the existing spectator/lazy-resume path is retained, not a second agent run. Parent conversations keep their cached state.
- Disable the companion plugin to restore the original sidebar and popup behavior. Already-open spectators remain read-only for safety.

## Why a companion patch?

The installed SDK has neither a child-row slot nor a delegate-card click interception hook. `host.openSession` alone cannot override those existing core handlers. This project does not pretend such SDK hooks exist and does not mutate the DOM or monkey-patch Electron.

The patch adds the explicit registry area `session.noSubagentPopup`. The plugin contributes `{ enabled: true }` to that area; disabling/unloading it removes the contribution through the normal plugin lifecycle. **Installing plugin.js into an unpatched desktop does nothing.**

Target upstream commit: `12e4d3e2dd5281adf289f70e5d6c7f33427d6982`. Other versions are rejected by normalized source hashes instead of guessed patches.

## Layout

- `plugin.js`: dependency-free companion plugin.
- `core/`: exact changed/new desktop source files, including actual React component tests.
- `patches/desktop.patch`: reviewable unified patch against the target upstream commit.
- `manifest.json`: before/after SHA-256 checksums for safe application.
- `scripts/patch-desktop.mjs`: checked apply/revert tool, with original source preserved outside Git tracking.
- `tests/`: model/plugin/spectator tests plus real-browser integration fixture.
- `VALIDATION.md`: verified results and explicitly pending checks.
- `GITHUB-PREP.md`: proposed repository/release details; no remote is created automatically.

## Development

Requires Node 22.18+ (Windows build validated using Node 26) and the target Hermes checkout's existing dependencies.

```sh
npm test
npm run check
node scripts/patch-desktop.mjs check /path/to/hermes-agent
node scripts/patch-desktop.mjs apply /path/to/hermes-agent
# In the modified checkout/apps/desktop:
npm run typecheck
# Targeted tests:
npx vitest run --project ui src/app/chat/sidebar/running-subagent-rows.test.tsx src/lib/open-subagent-in-current-window.test.ts src/components/assistant-ui/tool/delegate-no-popup.test.tsx src/app/chat/sidebar/session-row.test.tsx
npm run build
# To restore source:
node scripts/patch-desktop.mjs revert /path/to/hermes-agent
```

Apply is idempotent. All candidate files are checked before any overwrite. Modified/unsupported source and modified patched files are refused. A source rollback state file is stored at the target repository root; do not delete it before reverting.

## Installation safety

The deployed application is a packaged Windows build, not a live Vite source checkout. Source changes by themselves do not update its renderer. Build and validate in a separate worktree; package the renderer into a staged archive; then use the guarded installer while Hermes is **fully exited**, including the tray icon. It backs up and verifies the exact installed archive and plugin. No GUI processes are killed or launched from SSH.

The project must not be called installed/working until the packaged app is reopened normally by the user and the two interactions are verified there. Automated tests and an integration fixture are evidence about the build, not proof that the user's existing window has loaded it.

## Prepared Windows installer

The guarded installer is `scripts/install-windows.ps1`, with source and binary rollback tools included. It requires a separately built and verified candidate package plus the correct previous installed inventory. Fully exit Hermes, including its tray icon, before installing. These scripts are not a self-contained downloadable installer and never authorize killing or restarting a running GUI from SSH.

Do not delete the separate staged worktree/package until installation and live validation are complete. The local Windows package is unsigned. The existing installed archive is version/hash-pinned; if it updates before installation, the installer refuses to overwrite it.

## Limitations

The companion patch must be reapplied/revalidated after upstream desktop updates. Child visibility uses the existing live event store and snapshot RPC; an unbound/offline session has no trustworthy live roster and is not guessed. The read-only watch marker is per-window session storage, so it survives renderer reloads, not a wholly new application window.

## License

Companion code and patch additions are MIT. Modified upstream files retain Hermes' original MIT licensing; see `LICENSE` and `UPSTREAM-LICENSE`.
