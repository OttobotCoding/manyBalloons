# 🎈 Many Balloons

A self-hosted, multi-user birthday tracker. Add friends and family, share them with other
users or groups, and get emailed before their birthdays. New accounts require admin
approval before they can sign in.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [Running locally (no Docker)](#running-locally-no-docker)
- [Running with Docker Compose](#running-with-docker-compose)
- [Deploying on Unraid](#deploying-on-unraid)
- [Email notifications](#email-notifications)
- [API reference](#api-reference)
- [Production notes](#production-notes)

---

## Features

- **Friends & birthdays** — track name, birthday, phone, email, address, relationship,
  a photo, and notes. Age and days-until-next-birthday are computed on the fly, never
  stored.
- **Sharing** — share a friend with specific users or with a group.
- **Groups** — named collections of users for bulk-sharing friends.
- **Accounts & roles** — every friend record has an owner; `admin` users manage the
  whole app, `user` accounts manage their own data.
- **Self-registration with approval** — anyone can request an account from `/register`;
  it's created with `status: pending` and can't log in until an admin approves it from
  the admin panel.
- **Email notifications** — daily birthday reminders, a pending-approval email sent to
  new registrants, and a test-email button, all via SMTP (Nodemailer).
- **Activity log** — every significant action (logins, approvals, notifications sent/
  failed, CRUD on friends/groups/users) is recorded and browsable by admins.

---

## Tech stack

| Layer    | Technology                                                        |
|----------|--------------------------------------------------------------------|
| Frontend | React 18, React Router 6, TanStack Query v5, Axios, CSS Modules   |
| Backend  | Node.js 20, Express 4, TypeScript, Mongoose 8, JWT (httpOnly cookie) |
| Database | MongoDB 7                                                          |
| Email    | Nodemailer (SMTP), node-cron for the daily scheduler               |
| Uploads  | Multer (local disk under `server/uploads/`)                        |

---

## Project structure

```
manyBalloons/
├── Dockerfile                    ← 3-stage build: client → server → production image
├── docker-compose.yml            ← app + MongoDB, Unraid-style appdata paths
├── server/                       ← TypeScript Express API
│   ├── index.ts                  ← entry point, mounts routes, starts scheduler
│   ├── .example.env              ← copy to .env
│   ├── models/                   ← User, Friend, Group, Settings, ActivityLog
│   ├── routes/                   ← auth, friends, groups, settings, admin
│   ├── middleware/                ← requireAuth, requireApproved, requireAdmin, validation
│   ├── services/
│   │   ├── emailService.ts       ← Nodemailer sends (birthdays, pending-approval, test)
│   │   └── scheduler.ts          ← node-cron job, runs daily at 08:00
│   └── uploads/                  ← auto-created, stores friend photos
└── client/                       ← TypeScript React app
    └── src/
        ├── pages/                ← Dashboard, FriendForm, Login, Register, Settings...
        ├── pages/admin/          ← AdminDashboard, UserManagement, ActivityLog
        ├── components/
        ├── context/               ← AuthContext, ThemeContext
        └── services/api.ts       ← all Axios calls
```

---

## Environment variables

Server config lives in `server/.env` (copy from `server/.example.env`):

| Variable        | Default                                    | Notes                                             |
|------------------|---------------------------------------------|----------------------------------------------------|
| `PORT`           | `5000`                                      | API port                                            |
| `MONGO_URI`      | `mongodb://127.0.0.1:27017/many_balloons`   | MongoDB connection string                           |
| `CLIENT_ORIGIN`  | `http://localhost:3000`                     | Allowed CORS origin in development                  |
| `JWT_SECRET`     | *(must be set)*                             | Signs session cookies — use a long random value     |
| `TZ`             | `America/Denver`                            | Timezone the birthday scheduler runs in (`0 8 * * *`) |
| `NODE_ENV`       | *(unset in dev)*                            | Set to `production` in Docker; enables secure cookies |

**SMTP credentials are not environment variables.** They're stored in the `Settings`
document in MongoDB and configured from the in-app **Settings** page (admin only):
SMTP host/port/user/pass/from, the birthday-reminder recipient, and how many days
before a birthday to notify. The same SMTP config is reused to send the pending-approval
email to new registrants.

---

## Running locally (no Docker)

**Prerequisites:** Node.js ≥ 18/20, MongoDB reachable on `mongodb://127.0.0.1:27017`
(or `docker run -d -p 27017:27017 --name mongo mongo:7`).

```bash
# Server
cd server
cp .example.env .env      # edit JWT_SECRET at minimum
npm install
npm run dev                # ts-node + nodemon → http://localhost:5000

# Client (separate terminal)
cd client
npm install
npm start                  # → http://localhost:3000, proxies /api to :5000
```

Open `http://localhost:3000`. The first account you create via the setup screen becomes
the admin. Any account created afterwards through `/register` lands in `pending` status
until that admin approves it from **Admin → Users**.

---

## Running with Docker Compose

The Dockerfile is a 3-stage build: it compiles the React client, compiles the TypeScript
server, then assembles a slim production image that serves the API and the built React
app together on port `5000`. `docker-compose.yml` wires that image up with a MongoDB
container.

```bash
docker compose up -d --build
```

This starts two services:

| Service | Image             | Port         | Volume                                                 |
|---------|-------------------|--------------|----------------------------------------------------------|
| `mongo` | `mongo:7`          | (internal)   | `/mnt/user/appdata/birthday-tracker/mongo:/data/db`     |
| `app`   | built from `Dockerfile` | `5000:5000` | `/mnt/user/appdata/birthday-tracker/uploads:/app/server/dist/uploads` |

The volume paths (`/mnt/user/appdata/...`) are Unraid's conventional appdata location —
see the next section. **If you're running plain Docker (not Unraid)**, change those two
host paths to something that exists on your machine, e.g.:

```yaml
volumes:
  - ./data/mongo:/data/db          # under the mongo service
  - ./data/uploads:/app/server/dist/uploads   # under the app service
```

The `app` service already sets `MONGO_URI` to `mongodb://mongo:27017/many_balloons`
(the two containers talk over the compose network by service name) and `NODE_ENV=production`.
Add `JWT_SECRET` and `TZ` to the `app` service's `environment:` block — the compose file
as shipped doesn't set them, so the app falls back to an insecure default secret:

```yaml
  app:
    environment:
      PORT: 5000
      MONGO_URI: mongodb://mongo:27017/many_balloons
      NODE_ENV: production
      JWT_SECRET: "replace-with-a-long-random-string"
      TZ: America/Denver
```

Once it's up, visit `http://<host-ip>:5000`, run through setup to create the admin
account, then configure SMTP under **Settings** so birthday and pending-approval emails
can actually send.

To rebuild after pulling code changes:

```bash
docker compose up -d --build
```

To view logs / tear down:

```bash
docker compose logs -f app
docker compose down          # add -v to also drop the mongo volume
```

---

## Deploying on Unraid

There are two ways to get this running on Unraid: point Unraid's **Compose Manager**
plugin at the repo's `docker-compose.yml` directly (least manual work), or build the
image and add it as a container by hand through the Docker UI (more control, no
plugin dependency). Both assume the appdata paths from the compose file
(`/mnt/user/appdata/birthday-tracker/...`), which already follow Unraid convention.

### Option A — Compose Manager plugin

1. In **Apps**, search for and install **Compose Manager** (by dcflachs) from
   Community Applications if you don't already have it.
2. Copy this repo onto the array, e.g. `/mnt/user/appdata/birthday-tracker/src/`
   (via the Unraid terminal, `git clone`, or a network share).
3. In **Docker → Compose Manager**, add a new stack pointing at that folder's
   `docker-compose.yml`.
4. Before starting the stack, edit it (in the Compose Manager UI or the file directly)
   to add `JWT_SECRET` and `TZ` to the `app` service's `environment:` block, as shown
   above — without a real `JWT_SECRET` every login session is signed with a shared
   default value.
5. Confirm the two volume paths already point under
   `/mnt/user/appdata/birthday-tracker/` (mongo data and uploads) — Unraid will create
   them on first run if missing.
6. Click **Compose Up**. Unraid builds the image from the Dockerfile and starts both
   containers. The app is reachable at `http://<Unraid-IP>:5000`.

### Option B — manual container via the Docker tab

Unraid's **Add Container** form pulls a pre-built image; it doesn't build a Dockerfile
for you. So build (and optionally push) the image first, then add the container.

**1. Build the image.** SSH into Unraid (or use the terminal in the web UI) and run:

```bash
cd /mnt/user/appdata/birthday-tracker/src   # wherever you placed the repo
docker build -t many-balloons:latest .
```

(Alternatively, build it on another machine and push to Docker Hub or GHCR, then use
that image's full name below instead of `many-balloons:latest`.)

**2. Add a MongoDB container first**, if you don't already run one — either install the
**MongoDB** template from Community Applications, or add one manually with:

- **Repository:** `mongo:7`
- **Port:** container `27017` → host `27017` (or leave unmapped and only expose it on
  the internal Docker network if both containers share a custom bridge network)
- **Path:** `/mnt/user/appdata/birthday-tracker/mongo` → `/data/db`

**3. Add the app container** — **Docker → Add Container**, and fill in:

| Field | Value |
|-------|-------|
| Name | `many-balloons` |
| Repository | `many-balloons:latest` (or your pushed image tag) |
| Network Type | `bridge` (or the same custom network as the mongo container) |
| Port: Container `5000` → Host | `5000` (or any free host port) |
| Path: Container `/app/server/dist/uploads` → Host | `/mnt/user/appdata/birthday-tracker/uploads` |
| Variable `PORT` | `5000` |
| Variable `MONGO_URI` | `mongodb://<mongo-container-IP-or-name>:27017/many_balloons` |
| Variable `NODE_ENV` | `production` |
| Variable `JWT_SECRET` | a long random string |
| Variable `TZ` | your timezone, e.g. `America/Denver` |

If the mongo container isn't on a shared custom network with a resolvable container
name, use Unraid's assigned container IP for `MONGO_URI` instead of a hostname.

**4. Apply**, wait for the container to start, then visit `http://<Unraid-IP>:5000` to
run setup and create the admin account.

**Updating:** rebuild the image (`docker build -t many-balloons:latest .` again after
pulling new code) and restart the container from the Docker tab — Unraid will use the
freshly built local image.

---

## Email notifications

All email is sent via Nodemailer using SMTP settings stored in the `Settings` document
(configured from the admin **Settings** page — host, port, user, password, from address).

- **Birthday reminders** — `server/services/scheduler.ts` runs a `node-cron` job daily
  at 08:00 (server `TZ`) via `checkAndNotify()`, and emails `notificationEmail` with
  everyone whose birthday falls within `notifyDaysBefore` days.
- **Pending-approval email** — when someone registers via `/register`, the account is
  created with `status: pending` and `server/routes/auth.ts` immediately calls
  `sendPendingApprovalEmail()` (in `server/services/emailService.ts`) to the address
  they registered with, confirming their account is awaiting admin review. Delivery
  is logged to the admin Activity Log as `notification_sent` or `notification_failed`
  and never blocks registration if it fails.
- **Test email** — the Settings page has a "Send test email" action
  (`POST /api/settings/test`) to confirm SMTP credentials work before relying on them.

If SMTP isn't configured (`smtpUser`/`smtpPass` empty), both the scheduler and the
registration flow silently skip sending and log a note to the server console — accounts
and reminders still function, they just aren't emailed.

---

## API reference

All routes are prefixed with `/api`. Routes under `/friends`, `/settings`, and `/groups`
require an authenticated, approved user; `/admin` requires an authenticated admin.

### Auth (`/api/auth`) — public

| Method | Endpoint          | Description                                      |
|--------|-------------------|---------------------------------------------------|
| GET    | `/setup-status`   | Whether initial admin setup is needed              |
| POST   | `/setup`          | Create the first (admin) account                   |
| POST   | `/register`       | Self-register a `pending` account; sends approval email |
| POST   | `/login`          | Log in (blocked if not `approved`)                 |
| POST   | `/logout`         | Clear session (requires auth)                      |
| GET    | `/me`              | Current user (requires auth)                        |
| PUT    | `/password`        | Change own password (requires auth)                 |

### Friends (`/api/friends`)

| Method | Endpoint          | Description                                          |
|--------|-------------------|--------------------------------------------------------|
| GET    | `/`                | List friends (`?search=`, `?relationship=`, `?sort=`) |
| GET    | `/upcoming`        | Birthdays in the next N days (`?days=30`)              |
| GET    | `/:id`              | Get one friend                                          |
| POST   | `/`                 | Create (multipart/form-data, supports `photo`)          |
| PUT    | `/:id`              | Update (multipart/form-data)                             |
| DELETE | `/:id`              | Delete friend + photo file                              |

### Groups (`/api/groups`)

| Method | Endpoint | Description                          |
|--------|----------|----------------------------------------|
| GET    | `/`       | Groups the current user owns/belongs to |
| GET    | `/all`    | All groups (for sharing pickers)        |
| POST   | `/`       | Create a group                          |
| PUT    | `/:id`     | Update a group                          |
| DELETE | `/:id`     | Delete a group                          |

### Settings (`/api/settings`)

| Method | Endpoint | Description                              |
|--------|----------|--------------------------------------------|
| GET    | `/`       | Current notification/SMTP settings          |
| PUT    | `/`       | Update settings                             |
| POST   | `/test`   | Send a test email                           |

### Admin (`/api/admin`)

| Method | Endpoint                | Description                                  |
|--------|--------------------------|-------------------------------------------------|
| GET    | `/stats`                  | Dashboard overview stats                         |
| GET    | `/users`                  | List all users                                   |
| POST   | `/users`                  | Create a user directly (auto-approved)           |
| PUT    | `/users/:id/role`         | Change a user's role                             |
| PUT    | `/users/:id/status`       | Approve or reject a pending/rejected account      |
| PUT    | `/users/:id/password`     | Reset a user's password                          |
| DELETE | `/users/:id`               | Delete a user                                    |
| GET    | `/logs`                    | Paginated activity log (`?page=`, `?limit=`, `?action=`, `?userId=`) |

---

## Production notes

- Always set a strong, unique `JWT_SECRET` — the code falls back to a hardcoded default
  if it's missing, which is not safe for anything internet-facing.
- Put the app behind a reverse proxy with HTTPS (e.g. Nginx Proxy Manager, SWAG) if
  it's exposed outside your LAN — cookies are only marked `secure` when `NODE_ENV=production`,
  and that still requires TLS to actually protect them in transit.
- Back up the MongoDB volume (`/mnt/user/appdata/birthday-tracker/mongo` on Unraid) —
  it holds all user, friend, group, settings, and activity-log data.
- Photo uploads are stored on local disk (`uploads/` volume); for multi-host or
  higher-durability setups, swap Multer's local storage for S3-compatible object storage.
- SMTP credentials are stored in MongoDB in plaintext in the `Settings` document — fine
  for a self-hosted single-tenant app, but don't reuse a high-value account's password
  for it.