# CropShield 6 — Continuation Handoff

**Prepared:** 2 September 2026  
**Repository:** [Zinbas/cropshield-6](https://github.com/Zinbas/cropshield-6)  
**Latest source commit:** `c239fc2` — Add scan progress history and motion polish

## 1. Executive summary

CropShield 6 is a farmer-support web application for crop health monitoring, image-based scan analysis, follow-up cases, local agricultural services, weather guidance, and administrator review workflows. The latest implementation is pushed to GitHub and the latest commit has been built and promoted to the Vercel production alias.

The application currently contains two authentication paths: Manus OAuth/session plumbing and a local farmer/administrator test-account flow. The database is MySQL/TiDB-compatible and the backend is server-side Express plus tRPC. AI scan analysis is routed through a server-side Gemini-capable adapter when `GEMINI_API_KEY` is configured, with the existing Manus Forge path retained as a fallback where applicable.

## 2. Current architecture

| Area | Technology / location |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Wouter; `frontend/` |
| Backend | Express 4, tRPC 11, Zod, SuperJSON; `backend/` |
| Database | Drizzle ORM with MySQL/TiDB schema; `database/schema.ts` and `database/*.sql` |
| Authentication | Manus OAuth/session support plus local auth; `backend/localAuth.ts` and `backend/_core/` |
| AI | Server-side multimodal scan adapter; `backend/_core/llm.ts` and scan procedures in `backend/routers.ts` |
| Storage | S3-compatible storage helper; `backend/storage.ts` |
| Weather | Open-Meteo integration with unavailable/error states |
| Vercel API | `api/index.js` forwards to the built backend deployment entrypoint |
| Tests | Vitest unit/contract tests and Playwright E2E tests |

## 3. Latest product changes

### Visual and responsive redesign

The interface was changed from the previous mixed green/violet/red styling to an **olive-green and white product theme** across farmer and administrator surfaces. The redesign includes cleaner surfaces, more consistent status colors, stronger contrast, responsive spacing, improved focus states, larger touch targets, and a centered, evenly spaced mobile navigation bar with a central scan action.

The role-selection entry screen was simplified so farmers and administrators can choose their workspace without a dense wall of copy. Navigation is organized into focused areas rather than placing every feature on one page.

### Motion and interaction polish

Olive-green buttons, cards, loading states, press feedback, hover states, and interactive history rows now use short, tactile transitions. Non-essential motion is guarded by `prefers-reduced-motion` so users who request reduced motion are not forced to see decorative animation.

### Recent scans and recommendation continuation

The farmer dashboard now shows recent scan activity and saved recommendation progress. In Scan History, recommendation steps can be selected as completed. The progress is sent through the existing `updateRecommendationProgress` mutation, uses optimistic UI updates, and rolls back safely if persistence fails. A farmer can return later and continue unfinished recommendations instead of losing progress after leaving the result screen.

## 4. Important repository state

The GitHub `main` branch is current at commit `c239fc2`. Recent commits include:

- `c239fc2` — Add scan progress history and motion polish
- `e61c1d2` — Record full app theme and navigation correction
- `af4daa6` — Apply olive white theme across CropShield
- `6e05dcc` — Refresh CropShield mobile UX and visual system
- `10a9fee` — Use configurable Gemini model for crop scans
- `f0b65ee` — Switch AI integration to Gemini when configured

Useful files:

- `frontend/src/pages/Home.tsx` — page routing, role entry, dashboards, scan history, and recommendation progress UI
- `frontend/src/index.css` — global theme, responsive layout, motion, and mobile navigation rules
- `backend/routers.ts` — tRPC procedures including local auth, scans, cases, and recommendation progress
- `backend/_core/llm.ts` — server-side AI provider adapter
- `backend/localAuth.ts` — local farmer/administrator account flow
- `database/schema.ts` — database schema
- `vercel.json` — Vercel build/routing configuration
- `api/index.js` — Vercel serverless API entrypoint
- `project tracker` — feature and verification checklist

## 5. Manus preview

The managed Manus project is named `cropshield-6-manus`. The latest reviewable checkpoint is `6d582fc0` and the preview is:

**[Open Manus preview](manus-webdev://6d582fc0)**

The managed project has database, server, and user capabilities. Its preview URL is session-managed and may change when the project server restarts. Use the checkpoint link above when continuing inside Manus.

## 6. GitHub and Vercel connection

Vercel project: `cropshield-6`  
Vercel team: `Zinbas' projects` / `zinbas-projects`  
Production branch: `main`  
GitHub link: `Zinbas/cropshield-6`  
Production alias: [cropshield-6.vercel.app](https://cropshield-6.vercel.app/)

The latest commit `c239fc2` was deployed to Vercel, built successfully, and promoted to the production alias. The verified promoted production deployment was created from the corresponding ready preview deployment. A cache-busting HTTP check returned status 200 and confirmed that the deployed CSS contained both the olive theme marker and the scan-history progress styles.

To continue deployment:

1. Make changes in the repository.
2. Run the validation commands below.
3. Commit and push to `main`:

```bash
git add .
git commit -m "Describe the change"
git push origin main
```

4. Open Vercel and confirm a new deployment appears for the pushed commit.
5. If Vercel creates a Preview deployment, inspect it first, then use **Promote to Production** when it is ready.
6. If the production domain appears stale, force-refresh or use a cache-busting query string. Do not assume a stale browser cache means the deployment failed.

Switching Manus accounts does **not** remove GitHub or Vercel configuration. Automatic deployment will continue as long as the new Manus account can push to `Zinbas/cropshield-6` and uses the `main` branch. The Vercel project and its environment variables live in Vercel, not in the Manus account.

## 7. Environment variables

Never copy secret values from local configuration into this handoff, GitHub, chat, screenshots, or public documentation. The following variable names are relevant:

### Required server/runtime variables

- `DATABASE_URL` — MySQL/TiDB connection string for the application database
- `JWT_SECRET` — session signing secret
- `OWNER_OPEN_ID`
- `OWNER_NAME`
- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`
- `OAUTH_SERVER_URL`
- `VITE_APP_ID`
- `VITE_OAUTH_PORTAL_URL`

### Frontend/runtime configuration

- `VITE_APP_TITLE`
- `VITE_APP_LOGO` (optional)
- `VITE_ANALYTICS_ENDPOINT` (optional)
- `VITE_ANALYTICS_WEBSITE_ID` (optional)
- `VITE_FRONTEND_FORGE_API_URL` and `VITE_FRONTEND_FORGE_API_KEY` only if the frontend directly uses the Forge client path

### Gemini

- `GEMINI_API_KEY` — add this as a Vercel **Secret** variable. It is consumed server-side; never prefix it with `VITE_`.
- `GEMINI_MODEL` — optional model override if supported by the current adapter; otherwise the adapter default is used.

Set database, JWT/auth, and Gemini values for every environment that needs them: **Production**, **Preview**, and optionally **Development**. After changing environment variables, redeploy because Vercel injects them at deployment/runtime boundaries.

If Manus OAuth is removed later, the local authentication flow and all OAuth-dependent code must be reviewed together. Do not delete Manus OAuth variables until the application no longer imports or calls the OAuth/session plumbing.

## 8. Database and migrations

The database schema contains users, profiles, crops, scans, cases, experts, drug stores, and weather cache entities. Local-auth fields include `passwordHash` and `accountStatus` in the managed schema.

When changing the schema:

```bash
pnpm drizzle-kit generate
pnpm check
pnpm test
pnpm build
```

Review the generated SQL before applying it. Apply migrations through the managed database workflow with schema-capable credentials. Do not put database passwords in source files or commit `.env` files. Do not use destructive drop-and-recreate operations on the shared database.

## 9. Validation commands

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

The latest feature pass was validated with TypeScript, the project’s 63 automated tests, and the production build. For browser verification, test the role-selection screen at narrow width, verify mobile navigation spacing, create or open a scan, select recommendation steps, leave the page, return to Scan History, and confirm the progress remains saved.

## 10. Deployment and troubleshooting

### Vercel build is blocked

Earlier deployments were marked `BLOCKED` while Vercel Authentication/deployment protection was enabled. The project protection was disabled during the deployment recovery. If the status reappears, inspect Vercel project protection and deployment logs before changing application code.

### Production shows an old screen

First check the deployment’s commit SHA in Vercel. Then force-refresh, open an incognito window, or request the domain with a cache-busting query string. Compare the production asset markers against a fresh preview before concluding that the build is stale.

### tRPC returns HTML instead of JSON

This usually means the API request is being handled by the frontend fallback rather than the backend. Confirm `api/index.js`, `backend/deployment/index.js`, the Vercel routing configuration, and the deployment’s serverless function output. The API entrypoint was added specifically to address this class of issue.

### Authentication or database query fails

Confirm that `DATABASE_URL` and `JWT_SECRET` are present in the Vercel environment used by the deployment. Confirm the schema includes local-auth columns and that migrations have been applied. Never diagnose by printing secret values.

### Gemini scan fails

Confirm `GEMINI_API_KEY` is present in the selected Vercel environment and redeploy. Check runtime logs for provider errors without logging the key. If the key is absent, the adapter may use its retained Manus Forge fallback depending on the configured path.

## 11. Practical continuation checklist

- [ ] Confirm the new Manus account can access `Zinbas/cropshield-6`.
- [ ] Confirm Vercel still shows the GitHub link and `main` as production branch.
- [ ] Confirm `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY` exist in Vercel without revealing their values.
- [ ] Run `pnpm check`, `pnpm test`, and `pnpm build` before the next push.
- [ ] Test recommendation progress persistence with a real signed-in farmer account.
- [ ] Test the administrator dashboard separately from the farmer dashboard.
- [ ] Keep secrets out of commits, PDFs, screenshots, browser console output, and issue comments.

## 12. Reference links

- [GitHub repository](https://github.com/Zinbas/cropshield-6)
- [Latest GitHub commit](https://github.com/Zinbas/cropshield-6/commit/c239fc2b33e56dbb9d6231b052a51dd9abf039c1)
- [Live Vercel application](https://cropshield-6.vercel.app/)
- [Vercel project](https://vercel.com/zinbas-projects/cropshield-6)
- [Manus preview checkpoint](manus-webdev://6d582fc0)

**Security note:** This document intentionally omits all secret values. Retrieve or rotate credentials through the relevant provider’s secure dashboard rather than copying them from project files.
