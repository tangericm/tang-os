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

## Agent skills

### Issue tracker

Issues live as GitHub issues in `tangericm/tang-os`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, using the default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
