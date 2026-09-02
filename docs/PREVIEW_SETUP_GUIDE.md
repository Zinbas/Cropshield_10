# CropShield 6 Preview Setup and Handover Guide

This guide explains how to open the managed CropShield preview, run the project locally, validate the main workflows, and hand the project to another developer without exposing credentials.

## 1. Open the managed preview

The fastest way to view the current application is the managed WebDev preview:

1. Open the project checkpoint link supplied with the handover.
2. If the preview looks stale, use the project’s **Restart server** or **Sync latest version** action. This pulls the newest shared checkpoint before restarting the development server.
3. Confirm that the login screen loads and that the browser URL is the current managed preview URL.
4. Use the local test-account sign-in flow. Do not create duplicate showcase accounts unless you are intentionally testing registration.

The managed preview includes the configured server, frontend, database connection, authentication plumbing, storage integration, and project secrets. No `.env` file is required for normal preview use.

## 2. Showcase walkthrough

For a quick demonstration, sign in with the configured administrator test account and follow this path:

| Area | What to demonstrate |
|---|---|
| Admin dashboard | Approved scan totals, high-risk summary, regional risk heatmap, visible risk circles, and the risk legend |
| Farmers | Farmer directory grouped by regional summaries and account status controls |
| Scan Review | Approved scan assessments and confidence values |
| Experts | Expert directory, location matching, contact actions, and approval status |
| Stores | Approved agricultural stores and service details |
| Farmer dashboard | Crop snapshot, local weather fallback, compact regional-risk widget, and scan entry point |
| Risk Alerts | Predicted disease and pest threats, 7–15 day outlooks, reasons, and preventive actions |
| Scan history | Search and risk filters, expanded assessment details, observations, and recommendation progress |

Risk alerts are predictions and must be presented as potential threats, not confirmed disease diagnoses. The administrator heatmap uses aggregated approved data; it does not expose individual farmer locations.

## 3. Local development setup

Prerequisites are Node.js 22 or newer, pnpm, Git, and access to the intended MySQL/TiDB database and managed secrets.

```bash
gh repo clone Zinbas/cropshield-6
cd cropshield-6
pnpm install
pnpm dev
```

Open `http://localhost:3000` after the server reports that it is running. Keep credentials in the shell environment or the deployment provider’s secret manager. Never commit `.env`, API keys, database URLs, session secrets, generated logs, or uploaded media.

## 4. Database setup and migrations

The repository contains the Drizzle schema and reviewed migration SQL. Before changing the schema:

1. Update `database/schema.ts` and relations as needed.
2. Generate a migration with `pnpm db:push` only when the target database is explicitly selected and backed up.
3. Review the generated SQL before applying it.
4. Apply migrations through the managed database workflow or the approved deployment process.
5. Verify that the live procedures and frontend queries still work.

Do not run destructive or experimental migrations against the showcase database. Seed data should remain available for demonstrations.

## 5. Validation commands

Run these commands before opening a pull request or saving a new checkpoint:

```bash
pnpm check
pnpm test
pnpm build
pnpm test:e2e
```

The unit suite covers backend authorization, persistence contracts, regional-risk calculations, heatmap transformation, and frontend regressions. The Playwright suite covers the live admin regional heatmap and approved scan-review records. The E2E suite uses the Chromium executable configured by `e2e/playwright.config.ts`; override it with `PLAYWRIGHT_CHROMIUM` when needed.

For a different preview URL:

```bash
E2E_BASE_URL="https://your-preview-url" pnpm test:e2e
```

For a different administrator test account, use environment variables instead of editing committed test code:

```bash
E2E_ADMIN_EMAIL="..." E2E_ADMIN_PASSWORD="..." pnpm test:e2e
```

## 6. Common troubleshooting

**Preview shows an old screen.** Restart or sync the managed preview. Confirm the checkpoint/version shown by the project UI and check the current GitHub `main` commit.

**Weather is unavailable.** This is a supported fallback state. The dashboard remains usable and explains that local weather could not be loaded. Check server logs and outbound network access before changing frontend behavior.

**The map is blank.** Confirm that the managed Maps integration and its server-side configuration are available. The risk overlay and aggregate rows should still provide a useful fallback when map tiles are unavailable. Verify that approved regional summaries contain valid latitude and longitude values.

**Stores or experts do not appear as map points.** Directory records require valid latitude and longitude values before they can be plotted. Do not invent coordinates; collect and save verified locations first.

**Scanner persistence fails.** Check managed storage credentials and the server storage helper. Keep image bytes in managed storage and store only references in the database.

**E2E login fails.** Confirm that the test account exists, is active, and that the credentials were supplied through environment variables or the project’s approved secret manager. Do not place passwords in GitHub or this guide.

## 7. Handover checklist

- [ ] Managed preview opens and the latest checkpoint is visible.
- [ ] GitHub `main` and the managed project point to the same intended commit.
- [ ] `pnpm check` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm test:e2e` passes against the intended preview.
- [ ] Showcase administrator and farmer accounts are available through the approved credential channel.
- [ ] Database migrations and seed-data status are documented before any schema change.
- [ ] Storage, Maps, AI, OAuth, and database secrets remain outside source control.
- [ ] Any limitations, such as missing verified coordinates or unavailable upstream weather, are reported honestly.

## References

- [CropShield repository](https://github.com/Zinbas/cropshield-6)
- [Manus WebDev](https://www.manus.im/)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Vitest](https://vitest.dev/guide/)
- [Playwright](https://playwright.dev/docs/intro)
