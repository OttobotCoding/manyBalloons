# 🎂 BirthdayTracker

A full-stack CRUD app for tracking friends' birthdays and personal info.

---

## Tech stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 18, React Router 6, TanStack Query v5, CSS Modules |
| Backend  | Node.js, Express 4, Multer (file uploads) |
| Database | MongoDB via Mongoose 8                  |

---

## Project structure

```
birthday-tracker/
├── server/                       ← TypeScript — see server/tsconfig.json
│   ├── index.ts                  ← Express entry point
│   ├── package.json
│   ├── .env                      ← Copy from .env.example
│   ├── models/
│   │   └── Friend.ts             ← Mongoose schema + virtuals
│   ├── routes/
│   │   └── friends.ts            ← REST CRUD routes
│   ├── middleware/
│   │   ├── validation.ts         ← Request validation
│   │   └── errorHandler.ts       ← Central error handler
│   └── uploads/                  ← Auto-created; stores photo files
└── client/                       ← TypeScript — see client/tsconfig.json
    ├── package.json
    └── src/
        ├── index.tsx / index.css
        ├── App.tsx                ← Router + QueryClient
        ├── services/
        │   └── api.ts             ← All Axios calls
        ├── components/
        │   ├── Layout.tsx / .module.css
        │   ├── FriendCard.tsx / .module.css
        │   └── (Avatar, UpcomingBanner, Spinner in small_components file)
        └── pages/
            ├── Dashboard.tsx / .module.css
            ├── FriendDetail.tsx / .module.css
            └── FriendForm.tsx / .module.css
```

> Note: this project was migrated from JavaScript to TypeScript. See the
> root-level `README.md` for full, up-to-date setup/build instructions
> (including the `npm run build` compile step for production).

---

## Prerequisites

- **Node.js** ≥ 18 — https://nodejs.org
- **MongoDB** running locally on port 27017  
  Install via [MongoDB Community](https://www.mongodb.com/try/download/community) or run in Docker:
  ```bash
  docker run -d -p 27017:27017 --name mongo mongo:7
  ```

---

## Installation & running

### 1. Clone / create the project files

Create the directory structure above and place each file as shown.

**Important:** The middleware file artifact contains two modules concatenated.  
Split them into two separate files:
- `server/middleware/validation.js` — everything before the second `/**` comment
- `server/middleware/errorHandler.js` — everything from the second `/**` comment onward

Similarly, `client/src/index.js` contains a CSS block in a comment — extract the CSS rules into `client/src/index.css`.

The `client/src/components/` artifact contains three components. Split them into:
- `Avatar.jsx`
- `UpcomingBanner.jsx`
- `Spinner.jsx`

### 2. Set up the server

```bash
cd server
cp .env.example .env      # or create .env with the contents shown in the artifact
npm install                # also installs typescript + @types/* dev dependencies
npm run dev                # runs index.ts directly via ts-node, with nodemon
npm run build && npm start # production: compile to dist/ then run dist/index.js
```

### 3. Set up the client

```bash
cd client
npm install                # also installs typescript + @types/* dev dependencies
npm start                  # react-scripts type-checks .ts/.tsx on the fly
npm run build               # production: type-checked static build in client/build/
```

The `"proxy": "http://localhost:5000"` in `client/package.json` forwards all `/api/*` requests to the server automatically in development.

---

## API reference

| Method | Endpoint                    | Description                              |
|--------|-----------------------------|------------------------------------------|
| GET    | `/api/friends`              | List all friends (`?search=`, `?relationship=`, `?sort=`) |
| GET    | `/api/friends/upcoming`     | Friends with birthdays in next 30 days (`?days=N`) |
| GET    | `/api/friends/:id`          | Get one friend                           |
| POST   | `/api/friends`              | Create friend (multipart/form-data)      |
| PUT    | `/api/friends/:id`          | Update friend (multipart/form-data)      |
| DELETE | `/api/friends/:id`          | Delete friend + photo file               |
| GET    | `/api/health`               | Health check                             |

### Friend fields

| Field          | Type     | Required | Notes                                          |
|----------------|----------|----------|------------------------------------------------|
| `name`         | String   | ✅       | Max 100 chars                                  |
| `birthday`     | Date     | ✅       | Cannot be in the future                        |
| `age`          | Number   | —        | **Virtual** — calculated from birthday, never stored |
| `daysUntilBirthday` | Number | —   | **Virtual** — days until next birthday (0 = today) |
| `phone`        | String   | No       | Max 20 chars                                   |
| `email`        | String   | No       | Validated format                               |
| `address`      | String   | No       | Max 300 chars                                  |
| `relationship` | Enum     | No       | `friend` / `family` / `colleague` / `acquaintance` / `other` |
| `photo`        | String   | No       | URL path to uploaded image file                |
| `notes`        | String   | No       | Max 2000 chars                                 |

---

## Key design decisions

- **Age & countdown as Mongoose virtuals** — these are always computed at read time so they're never stale in the DB.
- **Photo storage** — photos are saved to `server/uploads/` via Multer. For production, swap this for S3 or Cloudinary.
- **TanStack Query** — all server state (loading, caching, invalidation) is handled by TanStack Query; no manual loading booleans in global state.
- **CSS Modules** — scoped styles per component, no class name collisions, no CSS-in-JS runtime overhead.
- **Proxy in `package.json`** — simplifies local development; no CORS config needed on the client side.

---

## Production considerations

- Store `MONGO_URI` and any secrets in environment variables (never commit `.env`)
- Replace local `uploads/` with cloud object storage (AWS S3 + signed URLs)
- Add authentication (e.g. JWT + bcrypt) before deploying publicly
- Build the client (`npm run build`) and serve the `build/` folder as static files from Express
- Use a process manager like PM2 for the server