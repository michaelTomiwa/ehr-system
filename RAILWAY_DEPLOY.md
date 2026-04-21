# Deploying This EHR System to Railway

This project is now configured for a single-service Railway deployment.
The backend serves the frontend, so Railway only needs to run one service.

## What This Setup Uses

- One Railway service
- One Railway volume for SQLite persistence
- One Dockerfile at the repository root
- Automatic first-run database seeding

## Why Railway Works Well Here

This app uses:

- Node.js and Express for the backend
- static HTML, CSS, and JavaScript for the frontend
- SQLite as a file database

Railway supports persistent Volumes, and its docs state that attaching a Volume makes the mount path available to the running service. Railway also automatically injects `RAILWAY_VOLUME_MOUNT_PATH` at runtime.

This repo is wired to use that mount path automatically for the SQLite database if `DATABASE_PATH` is not set manually.

## Files Added for Railway

- `Dockerfile`
- `.dockerignore`
- `railway.json`

Important backend support files:

- `backend/scripts/bootstrap-app.js`
- `backend/config/database.js`

## What Happens on First Deploy

When the app starts in Railway:

1. it creates the database tables if they do not exist
2. it checks whether roles and users already exist
3. if the database is empty, it seeds the demo data
4. on later deploys, it detects existing data and skips reseeding

## Deploy Steps

### 1. Push the repo to GitHub

Push this repository to GitHub first.

### 2. Create a Railway project

In Railway:

1. Click `New Project`
2. Choose `Deploy from GitHub repo`
3. Select this repository

Railway will detect the root `Dockerfile`.

### 3. Keep the service root at the repository root

Do not change the root directory to `backend`.

Reason:
The backend serves the sibling `frontend` folder, and the root Dockerfile copies both directories into the container.

### 4. Attach a Volume

Create and attach one Volume to the service.

Recommended mount path:

```text
/data
```

Railway's docs say the mount path becomes available in the running service as a normal writable directory.

Because this app reads `RAILWAY_VOLUME_MOUNT_PATH`, it will automatically store SQLite at:

```text
/data/ehr.db
```

if you mount the volume to `/data`.

### 5. Add environment variables

In the Railway service Variables tab, add:

```env
JWT_SECRET=replace_this_with_a_long_random_secret
NODE_ENV=production
```

Optional:

```env
DATABASE_PATH=/data/ehr.db
```

You do not have to set `DATABASE_PATH` if you attached the volume at `/data`, because the app can use Railway's provided `RAILWAY_VOLUME_MOUNT_PATH`.

Do not manually set `PORT`.
Railway injects `PORT` automatically, and the app already listens on `process.env.PORT`.

### 6. Deploy

Deploy the service.

The app should become available on the Railway public domain after the healthcheck succeeds at:

```text
/api/health
```

## After Deploy

Open:

- `/`
- `/api/health`

The root URL should show the login page.
The healthcheck endpoint should return JSON with `status: ok`.

## Demo Login Accounts

After the first successful seed, these accounts should work:

- `admin@ehrsystem.com`
- `amina.okafor@ehrsystem.com`
- `james.adeyemi@ehrsystem.com`
- `emeka.chukwu@gmail.com`
- `ngozi.obi@gmail.com`

Password for the seeded demo users:

```text
Password123!
```

## If Deploy Fails

Check these first:

- the volume is attached
- `JWT_SECRET` is set
- the service is using the repository root
- the Railway logs do not show a build failure

## Notes

- Keep this Railway service at one replica only because SQLite is file-based.
- This setup is suitable for a dissertation demo or small single-instance deployment.
- If you later want stronger production scaling, move from SQLite to PostgreSQL.

## Official Railway References

- Build and Start Commands: https://docs.railway.com/reference/build-and-start-commands
- Config as Code: https://docs.railway.com/config-as-code
- Monorepo Guide: https://docs.railway.com/guides/monorepo
- Volumes Reference: https://docs.railway.com/volumes/reference
- Using Volumes: https://docs.railway.com/guides/volumes
- Variables: https://docs.railway.com/variables
