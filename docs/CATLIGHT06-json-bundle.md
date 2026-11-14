# CATLIGHT06 · unified JSON presets

One export contains all three modes (projection, solid and floating), with shared controls normalized to the current values and independent geometry preserved. Unvisited modes use server defaults; failure to fetch them reports an export error instead of substituting outdated values. Media and administrator credentials are never included.

Import validates all three modes before changing anything, restores the personal mode snapshots and named presets, and stays in the currently selected mode. Version 1 single-mode files remain supported. An imported other-mode file updates that saved mode without switching the scene. Shared controls remain shared. Local-storage write failures roll back persisted values.

The existing local named-preset Save action remains per-mode. Administrator system-default saving and server data are unchanged.

Validation: tests/preset-bundle.cjs, tests/system-defaults.cjs, tests/admin-defaults.cjs; npm run build. Browser checked all three modes and successfully exported via the new button.

Netlify publication requires the existing site's authenticated deployment credentials; this workspace has no retained Netlify CLI login.
