# No Subagent Popup v0.2.0 — activity and timeout preview

## Highlights
- Dotted live subagent rows remain the single live sidebar representation.
- Sidebar rows and delegation cards show working/tool, streaming, provider wait with elapsed/budget, overdue threshold and last-update age.
- Shared live timers stop when no active status views remain.
- Optional backend companion enforces a FreeLLMAPI-only 30-second meaningful-data silence cap and transport limits, and emits phase/progress telemetry. Heartbeat/empty/role-only chunks do not extend patience.
- Independent result delivery uses Hermes' existing independent-completions setting; explicit groups remain grouped.

## Downloads
- **Companion plugin ZIP**: install only with the patched desktop core. It is not a standalone patch for stock Hermes.
- **Source ZIP**: desktop overlay, checked apply/revert scripts, optional backend companion, tests and changelog.
- **SHA256SUMS**: verify downloaded files before installing.

## Verified
Full desktop typecheck, 56 React/UI/history tests, 18 Node tests, 14 Python regression/wire tests, desktop/backend source apply/revert checks, and isolated Windows Electron packaging passed. The local Windows inventory contains 1,173 files and the packaged renderer carries the v0.2.0 marker.

## Deployment and limits
This is an **unsigned prerelease**. The local package is built, but installation preflight correctly refused to replace a running Hermes GUI. Live installed-app acceptance is pending. Backend source/config deployment and runtime process activation are separate; an older process must safely drain/roll over before new imported code is guaranteed active. Existing in-flight calls retain their captured timeout budgets.

Historical completed cards without saved exact child-session mappings remain a known limitation. Normal partial batches must not be completed or recovered prematurely. No claim of a signed general-purpose Windows installer or plugin-only UI injection.

See CHANGELOG.md, README.md and VALIDATION.md for exact scope and instructions.


## Optional reconciliation safety follow-up
A later source revision adds a narrow owner-identity guard: a failed process-start probe no longer permits recovery of an existing owner. Partial batches and uncertain owners remain protected; confirmed exits/PID reuse recover without replaying tools. Sixteen temporary-DB/real-process regression checks passed. The installed source was backed up and read back, but the older running backend has not been rolled over.

Download the supplementary **no-subagent-popup-reconciliation-v0.2.0-addon.zip** and **RECONCILIATION-SHA256SUMS** for this source-only addon. It has its own checked apply/revert script and does not replace the plugin or desktop package. The original v0.2.0 tag and original five downloads remain unchanged.
