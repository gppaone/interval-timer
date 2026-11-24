# Interval Timer

Use for exercise routines. Each user signs in with email + password and has their own routine. Only admins can create accounts.

## Deploying (Docker)

1. In `.env`, remove `TIMER_PASSWORD` and add (see `.env.example`):
   ```
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=a-long-password
   ```
2. `docker compose up -d --build`

On start the container:

- backs up an existing database to `dev.db.before-accounts` (first upgrade only),
- applies migrations (`prisma migrate deploy`),
- creates the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` if there are no users yet,
- starts the server.

Then sign in, open **⋯ → Manage users**, and add your wife's account with **“Give this user the existing routine”** ticked. That attaches the routine that was already stored to her account. After that you can delete `ADMIN_PASSWORD` from `.env`.

### Locked out?

```
docker exec -it interval-timer node scripts/user.mjs reset-password you@example.com 'new password'
```

## Local development

```
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

Create a first user with `node scripts/user.mjs create you@example.com 'password' --admin`.

## Changing the schema

Edit `prisma/schema.prisma`, then `npx prisma migrate dev --name what_changed` and commit the new folder under `prisma/migrations`.
