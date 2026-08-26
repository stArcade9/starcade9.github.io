# Coastal Signal — Token-Chapter Experience

A self-contained Next.js app implementing the QR-token chapter experience specified in [stories.md](./stories.md). Lives entirely inside this `stories/` directory and does not touch or depend on the static site at the repo root — it's meant to be deployed as its own Vercel project (see [Deployment](#deployment)).

## Architecture summary

- **Next.js App Router**, default Node.js runtime, deployed on Vercel as its own project (Root Directory = `stories`).
- **Neon Postgres** (free tier, via Vercel Marketplace) + **Drizzle ORM**, using `@neondatabase/serverless`'s WebSocket `Pool` driver (`drizzle-orm/neon-serverless`) rather than the HTTP driver, because chapter completion needs a real interactive transaction (`db.transaction`), not just batched queries.
- **Nova64** — the repo-root `runtime/` engine — is reused as-is, synced into `public/nova64/` at dev/build time (`scripts/sync-nova64.mjs`) so this app never reaches outside its own directory at request time. Chapter carts (`content/<story>/chapters/<id>/cart.ts`) are compiled to standalone ES modules under `public/carts/<story>/` by `scripts/build-carts.ts` (esbuild), matching the `cartUrl` shape the API returns. The client-side bootstrap (`public/engine/boot.js`) is a trimmed, faithful adaptation of the repo's real Nova64 bootstrap (`../src/main.js`) — same imports, same assembly order — with only the full desktop console's UI panel/debug-panel/Game-Studio-bridge code removed, since this minimal viewer has none of that.
- **Visitor identity**: an anonymous HMAC-signed cookie (`lib/visitor.ts`), separate from the experience token, so multiple visitors can scan the same permanent QR code independently (`lib/experience.ts`'s `progress` table is keyed on `(experience_id, visitor_id)`).
- **Seeds**: pure deterministic hash functions (`lib/seed.ts`) — `deriveExperienceSeed(token)` and `deriveChapterSeed(experienceSeed, chapterId)` — so a token's world (and each chapter's procedural variation) is always reproducible, not independently random per row.

See `stories.md` for the full original spec this implements.

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL and SIGNING_SECRET
pnpm db:migrate               # applies db/migrations/ to your database
pnpm db:seed                  # creates one test experience, prints its URL
pnpm dev
```

Then visit the URL printed by `pnpm db:seed` (e.g. `http://localhost:3000/x/<token>`).

To test the 24-hour countdown chapter without waiting: set `DEV_UNLOCK_DELAY_SECONDS=30` (or similar) in `.env.local` — every countdown chapter uses this instead of its real `unlockDelaySeconds` outside production (`lib/registry.ts`'s `effectiveUnlockDelaySeconds`).

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Neon). Same variable works for local dev and production — use a Neon branch per environment if you want isolation. |
| `SIGNING_SECRET` | yes | Random secret used to HMAC-sign the anonymous visitor cookie. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `NEXT_PUBLIC_BASE_URL` | yes | Base URL used when building QR code URLs (`{base}/x/{token}`). `http://localhost:3000` locally, `https://s.starcade9.io` in production. |
| `DEV_UNLOCK_DELAY_SECONDS` | no | Overrides every countdown chapter's delay outside production, for testing. Never set in production. |

### Tests

```bash
pnpm typecheck
pnpm test          # unit tests always run; integration tests auto-skip without DATABASE_URL
```

Integration tests (`tests/integration/`) exercise the real database-backed completion/idempotency/multi-visitor logic — point `DATABASE_URL` at a scratch Neon branch (not production) before running them for real, since they insert and delete rows.

Not automatable here: real-device testing on iOS Safari / Android Chrome (stories.md required test #11) — verify manually before shipping a batch of QR codes.

## Deployment

1. **Database**: In the Vercel dashboard, add the **Neon** integration from the Marketplace (free tier) to get a `DATABASE_URL`. Run `pnpm db:migrate` once against it (locally, with that `DATABASE_URL` in `.env.local`, or via a one-off Vercel deployment step).
2. **Vercel project**: create a **new, separate** Vercel project from this same GitHub repo, with **Root Directory set to `stories`**. This keeps it fully independent from the root static site's own Vercel/GitHub Pages deployment.
3. **Domain**: point `s.starcade9.io` at this project (per stories.md's permanent QR URL shape `https://s.starcade9.io/x/[token]`).
4. **Environment variables**: set `DATABASE_URL`, `SIGNING_SECRET`, and `NEXT_PUBLIC_BASE_URL=https://s.starcade9.io` in the Vercel project settings. Do **not** set `DEV_UNLOCK_DELAY_SECONDS` in production.
5. Push to `main` — Vercel builds and deploys automatically (`pnpm build` runs `scripts/sync-nova64.mjs` and `scripts/build-carts.ts --minify` first).

## Provisioning QR codes

```bash
pnpm experience:create --story coastal-signal --count 25
```

Generates `count` new experiences (cryptographically random tokens, deterministic seeds), inserts them into Postgres, and writes `provisioning-output/<story>-<timestamp>/` containing `experiences.csv` (serial, token, url, seed, QR filenames) plus SVG and high-res PNG QR codes per experience. Safe to rerun — every run mints fresh tokens and never touches existing rows, so running it again (same story or a new one) is always additive, never destructive.

## Content runbooks

### Add a chapter to an existing story

1. Create `content/<story>/chapters/<folder>/cart.ts` — a Nova64 cart exporting `init()`, `update(dt)`, `draw()`, reading `getChapterContext()` from `content/chapter-context.ts` for `tokenSeed`/`chapterSeed`/`complete()`. Use `nova64.mousePressed()` (managed input, resets automatically between cart loads) for tap interaction rather than a raw `window` listener — the runtime has no per-cart `dispose()` hook, so a raw listener from one chapter would leak into the next. See `content/coastal-signal/chapters/01-arrival/cart.ts` for a working example combining low-poly 3D geometry, a gradient skybox, retro post-processing presets, and the 2D particle overlay.
2. Register it in `content/<story>/manifest.ts`: add a `ChapterManifestEntry` with a new `id`, the next `order`, and `cartModule` pointing at the folder name from step 1.
3. Commit and push — Vercel deploys the change. No QR codes need to change and no new pages need to be generated (the shared `app/x/[token]/page.tsx` route serves every token).

### Launch a new story / shirt line

1. Create `content/<new-story-id>/manifest.ts` and its `chapters/` folder, same shape as `content/coastal-signal/`.
2. Register the story in `lib/registry.ts`'s `STORIES` map (one import + one map entry).
3. Run `pnpm experience:create --story <new-story-id> --count <n>` to provision and print/export its QR batch.

Every story lives side by side under `content/`, and the database's `experiences.story_id` column keeps their progress data fully separate — this is the same mechanism for every future drop, not a one-off.
