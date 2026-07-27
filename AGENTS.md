# AGENTS.md

## Cursor Cloud specific instructions

`tang-os` is a single Next.js 16 / React 19 web app (TypeScript) — Eric M. Tang's
personal site styled like a desktop OS. There is one runnable service and no
database, backend, or auth provider. Dependencies are refreshed automatically on
startup via the update script (`npm ci`), so you should not need to install them
manually.

Standard commands live in `package.json` and `README.md`; use those rather than
reinventing them:

- `npm run dev` — dev server on http://localhost:3000 (the whole product).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run verify` — typecheck + `next build` + `check:crawlable` (mirrors CI in
  `.github/workflows/ci.yml`).

Non-obvious notes:

- There is no separate lint step; type-checking (`tsc`) is the static check.
- `npm run check:crawlable` reads prerendered HTML from `.next/server/app/*`, so it
  must run after `npm run build` (that's why `verify` chains them). Running it on a
  stale/missing `.next` will fail.
- Every route renders both the interactive desktop and a hidden linear "sitedoc"
  HTML mirror for crawlers; which is shown is decided purely by CSS. When editing
  routes/data, keep both surfaces working — `check:crawlable` guards the mirror.
- `POST /api/ping-download` uses Resend and is optional: without `RESEND_API_KEY`
  it returns 204 and no-ops. Vercel Analytics/Speed Insights only report when
  deployed on Vercel; both are harmless locally.
