# Optional v0.2.0 reconciliation safety follow-up

This source-only addon is separate from the original v0.2.0 timeout overlay. It does not replace desktop assets or the companion plugin, change a live database, replay tools, restart Hermes, or change delegation timeout settings.

## Fix
A stored process-start fingerprint compared against a failed current fingerprint probe could previously classify a still-existing owner as dead. Preserve the owner when identity is uncertain. Recover only a confirmed absent process or confirmed PID reuse. The predicate is a conservative protection decision, not proof that the owner is healthy.

## Apply and revert
From the repository/addon root, using the actual Hermes source directory:

```sh
node scripts/patch-reconciliation.mjs check /path/to/hermes-source
node scripts/patch-reconciliation.mjs apply /path/to/hermes-source
# Optional rollback:
node scripts/patch-reconciliation.mjs revert /path/to/hermes-source
```

A unique reconciliation state file prevents collision with the earlier backend overlay. Other source versions are rejected. Source activation requires a separately planned safe backend process rollover. Do not interrupt active tasks merely to activate this patch.

## Verification
10 focused temporary-DB regression cases passed: partial 1-of-2 protection, known/missing owner fingerprints, failed start-time probes, confirmed PID reuse/exit, terminal unsent replay with idempotent claims, bounded retry and explicit grouping/independent delivery. Recovery is forbidden from dispatching replacement children/tools in these tests. Six existing real-process orphan/delivery tests also passed with the managed dependency path preserved in their test subprocess environment.

Run the focused suite with the matching Hermes Python environment and source on PYTHONPATH:

```sh
PYTHONPATH="/path/to/hermes-source${PYTHONPATH:+:$PYTHONPATH}" python -m pytest backend/reconciliation/tests/test_outbox_guards.py
```

These tests do not prove generalized crash consistency or live UI acceptance. No active database was repaired or replayed. The older running backend is not claimed to have loaded the installed source.
