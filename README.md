# CropShield 6

CropShield is a full-stack agritech platform for farmer registration, crop records, image-based crop health assessment, case follow-up, expert and store directories, weather guidance, and administrator review workflows.

## Repository layout

- `frontend/` — React application, routes, reusable UI components, and client-side data access.
- `backend/` — Express server, tRPC procedures, authentication, storage, AI gateway, and deployment entrypoints.
- `common/` — Types, constants, and shared error definitions used across the application.
- `database/` — Drizzle schema, relations, and migration SQL for the MySQL/TiDB database.
- `docs/` — Architecture and operational documentation.
- `patches/` — Package patches required by the dependency tree.

## Development

Install dependencies with `pnpm install`, then start the application with `pnpm dev`. Run `pnpm check`, `pnpm test`, and `pnpm build` before opening a pull request. Database commands require a configured `DATABASE_URL` and should be run only against an intended database.

See [`docs/PREVIEW_SETUP_GUIDE.md`](docs/PREVIEW_SETUP_GUIDE.md) for guided managed-preview setup, showcase walkthrough steps, database precautions, troubleshooting, and end-to-end validation commands.

## Configuration

Keep credentials in environment variables or the deployment provider's secret manager. Do not commit `.env` files, generated build output, dependency directories, or local runtime logs.
