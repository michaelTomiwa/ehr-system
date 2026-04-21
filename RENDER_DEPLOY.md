# Deploying This EHR System to Render

This project can be deployed to Render as a single Node.js web service.
The backend serves the frontend files, so both parts of the system run together in one service.

## Recommended Setup

- Service type: `Web Service`
- Runtime: `Node`
- Plan: `Starter` or higher
- Persistent disk: required for SQLite
- Instances: `1`

## Why the Persistent Disk Matters

The application uses SQLite (`better-sqlite3`) and stores data in a local `.db` file.
On Render, local service storage is ephemeral unless you attach a persistent disk.

This repo is already configured to use:

- `DATABASE_PATH=/var/data/ehr.db`
- Disk mount path: `/var/data`

Without the disk:

- seeded users can disappear after redeploys or restarts
- appointments, records, and audit logs will not persist reliably

## Fastest Option: Blueprint Deploy

This repo now includes a root-level `render.yaml`.

Steps:

1. Push this repository to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Select the repository.
4. Review the generated web service settings.
5. Confirm that the service includes:
   - build command: `cd backend && npm ci`
   - start command: `cd backend && npm run render:start`
   - health check path: `/api/health`
   - persistent disk mounted at `/var/data`
6. Create the service.

On first startup, the app will:

- create the SQLite schema
- seed the demo users and sample records if the database is empty
- skip reseeding on later deploys when data already exists

## Manual Render Setup

If you do not use the Blueprint:

1. Create a new `Web Service` from the same repository.
2. Leave the repo root as the project root.

Important:
Do not set the service root directory to `backend`, because the backend serves the `frontend` folder from the repository root level.

Use these settings:

- Build Command: `cd backend && npm ci`
- Start Command: `cd backend && npm run render:start`
- Health Check Path: `/api/health`

Add these environment variables:

- `NODE_VERSION=18`
- `DATABASE_PATH=/var/data/ehr.db`
- `JWT_SECRET=<your-secure-secret>`

Attach a persistent disk:

- Name: `ehr-data`
- Mount Path: `/var/data`
- Size: `1 GB` or more

## URLs and Features

After deploy:

- the app root `/` serves the login page
- `/api/*` serves the backend API
- role dashboards load from the same service
- SQLite data persists on the Render disk

## Operational Notes

- This SQLite setup is suitable for a dissertation demo or single-instance deployment.
- Keep the service scaled to one instance because SQLite is file-based.
- For multi-instance production use, migrate to PostgreSQL instead of SQLite.
