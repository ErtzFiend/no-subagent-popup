# Changelog

## v0.2.0 — 2026-10-26

### Added
- Authoritative provider-wait, working/tool and streaming states in dotted child rows and delegation cards.
- Elapsed provider-wait/budget display, overdue warning and honest last-update age without inventing terminal failure.
- A shared one-second live-status clock with cleanup when views settle/unmount.
- Backward-compatible optional activity fields in the subagent store and gateway wire contract.
- Optional backend companion: FreeLLMAPI-only 30-second first-response/useful-data silence policy, transport limits, meaningful-delta tracking and prompt cancellation.
- Version-checked backend source application/reversion, source/companion-plugin downloads and release checksums.
- Regression coverage using fake-clock React tests and real local HTTP/SSE servers.

### Fixed
- Empty/role-only deltas and SSE heartbeats no longer extend FreeLLMAPI patience indefinitely.
- LAN endpoint and reasoning/context timeout floors cannot override this route's explicit 30-second cap.
- Cancellation fences retries before socket teardown, preventing a race that reopened a stale stream.
- Old timeout budgets are cleared when an authoritative new activity phase supplies no budget.

### Preserved
- v0.1.3 exact-identity/owner-scoped sidebar deduplication; keep dotted rows rather than the duplicate tree renderer.
- Same-window read-only child viewing, parent state preservation, and original plugin-disable behavior.
- Partial responses retain existing safety handling; incomplete tool calls are not automatically replayed.

### Deployment notes / known limits
- Unsigned preview; live installed-app acceptance is not claimed.
- Plugin ZIP alone cannot modify stock Hermes Desktop. The companion core patch must be built and installed.
- Python source installation requires safe backend process rollover to activate existing imports. Configuration changes affect future requests/dispatches, not already captured in-flight deadlines.
- Historical completed cards without an exact saved child-session mapping remain unresolved.
- Normal partial batches are not abandoned/completed early merely because one child finished.

## v0.1.3 — source preview
- Consolidated dotted-row and ordinary-session selection through one parent/owner selector.
- Filtered duplicate live child rows before grouping/flattening/virtualization while preserving orphan/search rows and cross-owner collisions.
- Verified isolated typecheck, UI/Node suites, apply/revert guards and desktop build.
