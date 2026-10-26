# v0.2.0 verification record

## Executed checks

- Desktop full TypeScript typecheck passed against a separate Windows worktree.
- **56 UI/history tests across 6 files passed**, including 8 new fake-clock/store tests for ticking provider waits, shared timer cleanup, inactive views, overdue-but-not-failed state, legacy/no-budget fallback, stale last-update age and route-budget reset.
- **18 dependency-free project tests passed**; plugin and source-patch syntax checks passed.
- All **23 desktop overlay files** passed check/apply/check/revert/check against pinned upstream source. Backend **7-file** source overlay also passed check/apply/check/revert/check against its exact installed-source baseline.
- **14 Python regression/wire tests passed**: production 30-second policy selection; non-FreeLLMAPI isolation; meaningful/empty/role/reasoning/tool deltas; end-to-end phase relay/wire validation; real HTTP/SSE hanging headers, silent body, comments-only heartbeat and role-only streams; no hidden inner retry after timeout; healthy streaming beyond the accelerated silence threshold; existing socket-unwedge and interrupt regressions.
- Windows full build and unpacked Electron packaging succeeded. Packaged renderer includes all required patch markers, including `no-subagent-popup@0.2.0`; complete inventory contains **1,173 files**. This local package is unsigned.
- Owner-guard mutation tests from v0.1.3 deliberately failed cross-owner collision assertions as expected.

## Installed/configured versus active

- Installed configuration enables `delegation.independent_completions`; a real subsequent dispatch produced separate completion units. Existing batches are not regrouped.
- Effective installed getters for FreeLLMAPI/auto request/stale budgets both returned **30.0**, after lowering the existing 300-second per-model overrides as well as provider defaults.
- Seven backend source files were installed only after exact before-hash checks, with original source backups and exact after-hash readback. A fresh compatible Python process imported the installed policy and wire schema successfully.
- The older running dashboard process has **not** been restarted/rolled over in this verification record; its cached Python imports are not claimed to be updated.
- Local desktop installation preflight explicitly refused because Hermes was still running. No GUI process was killed or launched over SSH. A user-invoked updater is staged locally; packaged build success is not installation success.

## Open / not claimed

- Live desktop installation, backend runtime rollover and actual installed-app visual acceptance remain pending.
- The plugin ZIP alone does not patch stock Desktop; a compatible built core is required.
- Historical completed cards lacking saved exact session mappings remain unresolved.
- Any normal 1-of-2 partial batch must stay running while its sibling works. No abandoned-worker recovery change is accepted without negative tests proving that rule and live-owner protection.
- No claim of generalized performance/load testing, real OS window-count verification or a signed public installer.

## Test scope and warnings

React tests use controlled stores and mocked navigation/snapshot bridges. SSE tests use real local servers and accelerated thresholds rather than waiting 30 seconds per case. Existing React act/localStorage warnings were present but all listed assertions passed. Tests initially detected a socket-close/retry race; the deadline now fences retries before transport teardown. A wrong-Python ABI in the scratch harness was corrected by using the compatible managed Python interpreter; production dependencies were not altered.

## Post-release reconciliation follow-up

A real owner-theft risk was reproduced against the previously installed source: a known stored fingerprint plus a failed current start probe returned unprotected despite a live PID. The narrow guard now preserves uncertainty. **16 reconciliation tests passed** (10 new temporary-DB cases and 6 existing real-process delivery/orphan checks). The earlier subprocess failures were test-harness dependency-path failures, corrected only in scratch; production dependencies were not changed. The narrow source change was deployed with an exact before-hash check, original backup, and exact after-hash readback. It has not been activated in the older running dashboard process. See backend/reconciliation/README.md. The original v0.2.0 tag/assets are not rewritten.
