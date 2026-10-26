# Validation status

This is a source-development preview, not a verified release or a deployed fix.

## Rechecked for publication

- Dependency-free project suite: 11 tests passed (`node --test tests/*.test.mjs`).
- Plugin and source-patching script syntax checks passed.
- All 16 source-overlay entries matched the existing v0.1.2 checksum manifest before duplicate-row refactoring.
- The NFS-backed project directory was verified. A similarly named local directory is not the project mount and was not used as the publication source.
- The personal GitHub account was authenticated and repository creation read back. No credentials, machine-specific inventories, logs, binary packages or install-state files belong in the repository.

## Earlier evidence — not a new live acceptance test

Earlier v0.1.2 Windows build output reported successful typechecking, Node tests, packaging and patch-marker checks, with a 1,173-file package inventory. That package was staged separately. The installed ASAR was subsequently verified to remain the earlier v0.1.1 tracked version.

Running-child same-window navigation was user-confirmed. Completed-child navigation was subsequently reported broken. A passing model or fixture test must not be presented as evidence that completed cards work in the installed app.

## Open

- Remove duplicate lower tree-style subagent session rows while keeping dotted live children.
- Run the new duplicate-row regression suite and source apply/revert checks.
- Build and package the final deduplicated source in isolation.
- Reopen the installed candidate interactively and validate same-window navigation, read-only viewing, parent return, and completion cleanup.
- Historical completed cards without saved exact child-session mappings remain unresolved. Separate backend/frontend contract work is not included as a completed fix here.
- Long-list performance and extended reconnect behavior are not verified.

No signed release is published. No running GUI has been stopped or replaced by this publication process.
