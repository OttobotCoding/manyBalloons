# 🎈 Many Balloons

A full-stack birthday and personal information tracker. Never miss a birthday again.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![MongoDB](https://img.shields.io/badge/mongodb-7.x-green)

---

## Features

- **Dashboard** — all friends at a glance with upcoming birthday highlights
- **Calendar view** — monthly grid with birthday dots and click-to-view popover
- **Upcoming list** — all birthdays sorted by next occurrence, grouped by month
- **Full CRUD** — add, edit, view, and delete friend records
- **Friend profiles** — name, birthday, age (auto-calculated), phone, email, address, relationship type, photo, and notes
- **Email notifications** — daily scheduled emails for upcoming birthdays via configurable SMTP
- **Authentication** — JWT-based login with httpOnly cookies, first-run setup, and change password
- **Dark mode** — full dark/light theme toggle with OS preference detection and localStorage persistence
- **Search and filter** — filter by name, relationship type, and sort order
- **Responsive design** — works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, TanStack Query v5, CSS Modules |
| Backend | Node.js, Express 4 |
| Database | MongoDB 7 via Mongoose 8 |
| Auth | JWT + bcryptjs + httpOnly cookies |
| Email | Nodemailer |
| Scheduler | node-cron |
| File uploads | Multer |
| Containerisation | Docker |

---

## Project Structure

```
many-balloons/
├── Dockerfile                        ← Multi-stage build (React + Node)
├── docker-compose.yml                ← Local Docker orchestration
├── .gitignore
├── README.md
│
├── server/
│   ├── index.js                      ← Express entry point
│   ├── package.json
│   ├── .env                          ← Environment variables (not committed)
│   ├── uploads/                      ← Uploaded profile photos (not committed)
│   ├── models/
│   │   ├── Friend.js                 ← Friend schema + age/birthday virtuals
│   │   ├── Settings.js               ← Notification preferences schema
│   │   └── User.js                   ← Admin user schema (bcrypt hashed password)
│   ├── routes/
│   │   ├── auth.js                   ← Login, logout, setup, change password
│   │   ├── friends.js                ← CRUD endpoints for friends
│   │   └── settings.js               ← Notification settings endpoints
│   ├── middleware/
│   │   ├── requireAuth.js            ← JWT cookie validation
│   │   ├── validation.js             ← Request body validation
│   │   └── errorHandler.js           ← Centralised error handling
│   └── services/
│       ├── emailService.js           ← Nodemailer email builder and sender
│       └── scheduler.js              ← node-cron daily birthday check
│
└── client/
    ├── package.json
    └── src/
        ├── index.js                  ← React entry point
        ├── index.css                 ← Global styles + CSS theme variables
        ├── App.js                    ← Router, providers, protected routes
        ├── context/
        │   ├── AuthContext.js        ← User state, login/logout
        │   └── ThemeContext.js       ← Dark/light mode toggle
        ├── services/
        │   └── api.js                ← All Axios API calls
        ├── components/
        │   ├── Layout.jsx            ← App shell, nav, logout button
        │   ├── Layout.module.css
        │   ├── FriendCard.jsx        ← Dashboard friend tile
        │   ├── FriendCard.module.css
        │   ├── Avatar.jsx            ← Photo or initials avatar
        │   ├── UpcomingBanner.jsx    ← Upcoming birthdays strip
        │   └── Spinner.jsx           ← Loading indicator
        └── pages/
            ├── Login.jsx             ← Login + first-run setup
            ├── Login.module.css
            ├── Dashboard.jsx         ← Friend grid + search + filters
            ├── Dashboard.module.css
            ├── FriendDetail.jsx      ← Full friend profile view
            ├── FriendDetail.module.css
            ├── FriendForm.jsx        ← Add / edit friend form
            ├── FriendForm.module.css
            ├── CalendarView.jsx      ← Monthly birthday calendar
            ├── CalendarView.module.css
            ├── UpcomingList.jsx      ← Birthdays sorted by next occurrence
            ├── UpcomingList.module.css
            ├── Settings.jsx          ← Notification config + change password
            └── Settings.module.css
```

---

## Prerequisites

- **Node.js** v18 or later — https://nodejs.org
- **MongoDB** v7 running locally on port 27017
  - Install: https://www.mongodb.com/try/download/community
  - Or run in Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`
- **Docker** (for containerised deployment) — https://www.docker.com

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/many-balloons.git
cd many-balloons
```

### 2. Configure the server environment

Create `server/.env` — copy the template below and fill in your values:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/many_balloons
CLIENT_ORIGIN=http://localhost:3000
JWT_SECRET=replace_with_a_long_random_string
TZ=America/New_York
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Install dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 4. Start the development servers

You need two terminals running simultaneously:

**Terminal 1 — API server:**
```bash
cd server
npm run dev
```
Expected output:
```
✅  MongoDB connected → mongodb://127.0.0.1:27017/many_balloons
⏰  Birthday notification scheduler started (runs daily at 8:00 AM)
🚀  Server running on http://localhost:5000
```

**Terminal 2 — React client:**
```bash
cd client
npm start
```

The app opens automatically at `http://localhost:3000`.

### 5. First-run setup

On first launch with no account, you are redirected to a setup screen. Create your admin username and password (minimum 8 characters). After that, every visit requires login.

---

## API Reference

All endpoints except auth routes require a valid JWT cookie (set automatically on login).

### Auth

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth/setup-status` | Check if first-run setup is needed |
| POST | `/api/auth/setup` | Create the admin account (first run only) |
| POST | `/api/auth/login` | Authenticate and receive JWT cookie |
| POST | `/api/auth/logout` | Clear the JWT cookie |
| GET | `/api/auth/me` | Return the current authenticated user |
| PUT | `/api/auth/password` | Change the admin password |

### Friends

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/friends` | List all friends (`?search=`, `?relationship=`, `?sort=`) |
| GET | `/api/friends/upcoming` | Friends with birthdays within N days (`?days=30`) |
| GET | `/api/friends/:id` | Get one friend |
| POST | `/api/friends` | Create a friend (multipart/form-data for photo) |
| PUT | `/api/friends/:id` | Update a friend |
| DELETE | `/api/friends/:id` | Delete a friend and their photo |

### Settings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/settings` | Get notification settings |
| PUT | `/api/settings` | Update notification settings |
| POST | `/api/settings/test` | Send a test email |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server health check |

---

## Friend Schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | ✅ | Max 100 characters |
| `birthday` | Date | ✅ | Cannot be in the future |
| `age` | Number | — | Virtual — calculated at query time |
| `daysUntilBirthday` | Number | — | Virtual — days until next birthday |
| `nextBirthday` | Date | — | Virtual — date of next birthday |
| `phone` | String | No | Max 20 characters |
| `email` | String | No | Validated format |
| `address` | String | No | Max 300 characters |
| `relationship` | Enum | No | `friend` `family` `colleague` `acquaintance` `other` |
| `photo` | String | No | Path to uploaded image file |
| `notes` | String | No | Max 2000 characters |

---

## Email Notifications

Notifications are sent by a `node-cron` job that runs every morning at 8:00 AM (server timezone). The scheduler checks MongoDB for friends whose birthday falls within the configured threshold and sends a single digest email.

**Supported SMTP providers:**
- Gmail (use an App Password — requires 2FA)
- Any standard SMTP server (port 587 STARTTLS or 465 SSL)

**Gmail setup:**
1. Enable 2-Step Verification at https://myaccount.google.com/security
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Enter `smtp.gmail.com`, port `587`, your Gmail address, and the App Password in Settings

To trigger the notification check manually (useful for testing):
```bash
# Local
node -e "require('dotenv').config(); require('./services/scheduler').checkAndNotify().then(() => process.exit(0))"

# Docker / Unraid
docker exec -it many-balloons node -e "require('./services/scheduler').checkAndNotify().then(() => process.exit(0))"
```

---

## Docker Deployment

### Build and push to Docker Hub

```bash
# Build
docker build -t yourdockerhubusername/many-balloons:latest .

# Push
docker login
docker push yourdockerhubusername/many-balloons:latest
```

### Environment variables for production container

| Variable | Example | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables React static serving |
| `MONGO_URI` | `mongodb://192.168.1.x:27017/many_balloons` | MongoDB connection string |
| `PORT` | `5000` | Server port |
| `JWT_SECRET` | `(long random string)` | Token signing secret |
| `TZ` | `America/New_York` | Timezone for the notification scheduler |

### Volume mapping

| Host path | Container path | Purpose |
|---|---|---|
| `/mnt/user/appdata/many-balloons/uploads` | `/app/server/uploads` | Persists uploaded profile photos |

---

## Unraid Deployment

See `UNRAID_DEPLOYMENT.md` for full step-by-step instructions covering:
- Installing MongoDB and Nginx Proxy Manager via Community Applications
- Configuring the Docker container
- Setting up a public domain with free SSL via Let's Encrypt
- Port forwarding and dynamic DNS
- Backups and security hardening

---

## Update Workflow

```bash
# 1. Make code changes locally and test

# 2. Commit and push to GitHub
git add .
git commit -m "describe your changes"
git push

# 3. Build and push new Docker image
docker build -t yourdockerhubusername/many-balloons:latest .
docker push yourdockerhubusername/many-balloons:latest

# 4. Pull and restart on Unraid (run via SSH)
docker pull yourdockerhubusername/many-balloons:latest && docker restart many-balloons
```

---

## Database Backup

```bash
# Backup (Unraid)
docker exec -it <mongo-container> mongodump \
  --db=many_balloons \
  --out=/data/db/backup

# Restore (Unraid)
docker exec -it <mongo-container> mongorestore \
  --db=many_balloons \
  /data/db/backup/many_balloons
```

---

## License

MIT — do whatever you like with it.
