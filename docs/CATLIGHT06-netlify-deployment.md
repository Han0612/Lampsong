# CATLIGHT06 · Netlify deployment

Published and verified 2026-11-10. Frontend remains v142; current node remains CATLIGHT06.

- Public URL: https://kugou-weiguang-catlight06.netlify.app/
- Netlify site ID: e2ff9477-0436-4ea0-87dc-e6db291a30b6
- Verified production deployment: 6af3280babb5b4341984cdb8 (ready)
- Source frontend: f9fc8106d1cc5ef3519710664d3fba2b69ca5347.
- Original Sites publication and the existing CD Box / Music Flight Netlify projects are unchanged.
- Production is public; preview visibility remains private.

## Parameter persistence

`npm run build:netlify` builds the same frontend and settings validation, using `netlify/seed.json` only as initial fallback. It contains the three administrator-saved mode defaults and seven cover-lyrics responses captured from the original API (one text override).

The Netlify function uses site-wide, strong-consistency Blobs storage. The production namespace is `catlight-defaults-production`; previews use `catlight-defaults-preview`. Defaults are committed together in `system-defaults/v2/all.json`, with conditional revision checks and history. Redeploying does not replace saved records with seed values. Cover lyrics have independent records.

The administrator password is unchanged. Netlify Free rejected functions-only environment scopes; no broadly scoped plaintext password variable was retained. Instead, `admin/password-verifier` in the private production store contains a random salt and scrypt verifier (N=32768, r=8, p=1, 32-byte result). The server-only function validates it with constant-time comparison, retaining the existing rate limit and same-origin checks. No password or verifier is shipped in public static files or committed to source. Reusing this same site/store preserves the verifier; deploying a new site requires initializing its verifier before administrator saves work.

Browser-personal settings stay on each origin. The Netlify copy initially uses migrated administrator defaults; later administrator changes on Netlify and the original Sites site are independent.

## Verified

- Build and function packaging passed.
- `tests/system-defaults.cjs`, `tests/defaults-api.mjs`, `tests/admin-defaults.cjs`, `tests/netlify-storage.mjs`, and `tests/netlify-auth.mjs` passed.
- Unauthenticated public API GET returned all three modes, exactly matching migrated seed settings.
- Authenticated production POST saved all three modes without changing their values; fresh GET returned the committed revision.
- All seven cover-lyrics GET responses matched the migrated source.
- A second production deployment completed, then unauthenticated GET returned exactly the same defaults and revision.
- No administrator plaintext environment variables remain on the site.
- Browser checked projection, solid and floating modes, the settings panel, and the all-three-mode save confirmation. Public page reload succeeded.
- Screenshot: `docs/qa/CATLIGHT06-netlify-live.png`.

## Future releases

Keep this Netlify site ID and production Blobs namespace. Build with `npm run build:netlify`, then deploy `dist/client` plus `netlify/functions`. Do not reset the store or replace it with deploy-specific storage. Update this current node unless the user explicitly requests a new node. Do not publish this hosting adaptation to the original Sites URL unless requested.
