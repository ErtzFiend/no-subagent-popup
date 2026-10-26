# No Subagent Popup — v0.2.0

Hermes Desktop companion patch and plugin for dotted live subagents, same-window read-only viewing, and truthful activity status.

[Project](https://github.com/ErtzFiend/no-subagent-popup) · [Releases](https://github.com/ErtzFiend/no-subagent-popup/releases) · [Changelog](CHANGELOG.md) · [Verification](VALIDATION.md)

## What changed

- Keep one dotted live-child list beneath each parent. Suppress duplicate ordinary tree rows only when exact transcript identity and connection/profile agree.
- Show **working**, active tool, **streaming**, or **waiting on provider** with an elapsed counter and an authoritative timeout budget when reported.
- One shared one-second clock updates visible live statuses without requiring another server event. It stops when no live status views remain.
- Show old progress as **last update N seconds ago**, not a fabricated dead/failed worker. A missing backend budget never implies a 30-second policy.
- Keep same-window read-only child navigation and live-group completion cleanup. Saved sessions are not deleted or globally hidden.

## Plugin download versus core patch

The installed SDK does not expose the required sidebar and existing-card interception hooks. The companion patch adds the explicit `session.noSubagentPopup` registry area; `plugin.js` enables it through the normal plugin lifecycle. **The plugin alone cannot patch an unmodified desktop.**

Release assets include the companion plugin ZIP, a complete source ZIP, and SHA-256 checksums. The plugin ZIP contains `no-subagent-popup/plugin.js`; place that directory under the desktop's configured `desktop-plugins` directory **after building/installing the companion core patch**. Disable the plugin to restore ordinary sidebar/popup behavior; already-open spectators remain read-only.

## Desktop source

Pinned upstream: `12e4d3e2dd5281adf289f70e5d6c7f33427d6982`. Exact normalized source hashes reject unsupported or locally modified files rather than guessing.

```sh
npm test
npm run check
node scripts/patch-desktop.mjs check /path/to/hermes-agent
node scripts/patch-desktop.mjs apply /path/to/hermes-agent
# In that checkout/apps/desktop:
npm run typecheck
npx vitest run --project ui src/lib/subagent-status.test.tsx src/app/chat/sidebar/parent-subagents.test.tsx src/app/chat/sidebar/running-subagent-rows.test.tsx src/app/chat/sidebar/session-row.test.tsx src/lib/no-subagent-popup-history.test.ts src/components/assistant-ui/tool/delegate-no-popup.test.tsx
npm run build
# Source rollback:
node scripts/patch-desktop.mjs revert /path/to/hermes-agent
```

Requires Node 22.18+ and the pinned checkout's desktop dependencies. Build in a separate worktree. The guarded Windows installer requires that separately built package, its generated full inventory, and the previous installed inventory. Fully exit Hermes, including the tray icon, before installation. Nothing here authorizes killing a user's GUI or launching it from SSH. Local Windows packages are unsigned; no signed general-purpose installer is included in the plugin download.

## Optional backend companion

`backend/` adds a FreeLLMAPI-only **30-second no-meaningful-data cap**, request socket limits, and optional phase/progress events. Content, reasoning and tool-call data count as progress; role-only/empty chunks and SSE keepalives do not extend the deadline. Healthy streaming may last longer than 30 seconds. A timed-out stream is cancelled without the inner stream retry loop silently opening another attempt; existing outer failure/fallback handling remains responsible for recovery. Partial tool calls are not replayed.

Backend configuration uses existing Hermes keys:

```yaml
providers:
  freellmapi:
    request_timeout_seconds: 30
    stale_timeout_seconds: 30
    models:
      auto:
        timeout_seconds: 30
        stale_timeout_seconds: 30
delegation:
  independent_completions: true
```

Per-model overrides win, so check the effective getters rather than only the provider-level YAML. Independent completions affects new dispatches, not batches already running. Explicit task groups remain grouped.

The backend baseline is separately version/hash-checked and includes earlier local reliability work; it is **not a universal patch for arbitrary Hermes checkouts**:

```sh
node scripts/patch-backend.mjs check /path/to/hermes-agent
node scripts/patch-backend.mjs apply /path/to/hermes-agent
# Safely drain and roll over/restart that backend to activate imported Python changes.
# Source rollback, where this tool created the backup state:
node scripts/patch-backend.mjs revert /path/to/hermes-agent
```

The patch tool never restarts services. Disk installation and a fresh-process import check do not prove an older running process loaded new code. Without backend activity fields, the UI keeps generic status/last-update age; it does not invent provider waits.

## Verification and limits

See `VALIDATION.md` for executed checks and open deployment/activation requirements. This is an unsigned preview pending live installed-app acceptance. Historical completed cards with no saved exact child-session link remain a separate known limitation. Source publication, passing tests and an isolated package build are not claims of live UI acceptance.

## License

MIT for additions. Modified upstream files retain Hermes' original MIT licensing; see `LICENSE` and `UPSTREAM-LICENSE`.
