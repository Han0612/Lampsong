# Project preferences

- Preserve all existing font choices and packaged font assets. The owner explicitly requested that the November 5, 2026 additions remain available after this trial. Do not delete fonts, remove their menu entries, subset their glyph coverage, or replace them as part of cleanup without explicit user authorization.
- Distinct supplied font weights remain separate selectable entries. Reuse byte-identical uploaded duplicates instead of shipping another copy.
- Discuss a complete change list with the owner and wait for their explicit “开始” before implementation. After each release provide the version, change list, verification steps, and any unfinished items.

- Keep updating CATLIGHT06 unless the owner explicitly requests a new node. A normal version increment is not a new checkpoint.

- Authorized November 5 v106 exception: hide `fz-lanting-bold`, `fz-ya-song`, `fz-vdl-jianzhu-eb`, and `fz-da-ya-song` from font menus, retain their complete packaged font files. Keep `fz-yue-song` (清刻本悦宋). Group remaining sans/black faces together and Song/serif faces together. Migrate older presets to the nearest retained face rather than discarding all settings.
- Lamp picker must show all 18 fixtures in two columns and nine rows, without scrolling. Disco carries only a small `special` badge. Light GUBI A1965 has only the white body, without the reference's brass counterweight.
- v106 direction: retain current projection resolution. Do not crossfade different projection contours during geometry changes; vertical shadow fade remains an independent setting.

- v107 owner direction: retain original seven plus PH5, Caravaggio, dark GUBI Semi, Jazz and Disco (12 in two columns/six rows). Remove the other six new picker options. Keep font assets. Disco rotation/spot controls and refined materials; no cover hover hints.

- v107 latest steering: GUBI Semi is matte white, not green; selection dot left of lamp, miniature beam below selected lamp, no selection frame, inline centered special badge, 5%-opacity white divider.

- v109 owner-approved scope: revert only lyric renderer to pre-resolution-change b21e5f7, retaining current layout/settings. Pending lamp/cat TODO is not included in this rollback. This supersedes v106/v107 requirements to keep high-resolution/background projection.
