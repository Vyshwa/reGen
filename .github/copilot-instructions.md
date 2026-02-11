# Copilot instructions for reGen

## Big picture architecture
- Monorepo with separate frontend and backend: Vite + React in [frontend/](frontend) and Express + MongoDB in [server/](server).
- UI data flow goes through the actor abstraction: UI components → `useQueries` (React Query) → `useActor` → HTTP actor → `/api/*` routes → controllers → Mongoose models. See [frontend/src/hooks/useQueries.js](frontend/src/hooks/useQueries.js) and [frontend/src/hooks/useActor.js](frontend/src/hooks/useActor.js).
- The frontend is proxied to the backend via Vite dev server (`/api` → `http://127.0.0.1:5006`). See [frontend/vite.config.js](frontend/vite.config.js).

## Backend conventions
- Express app entry is [server/index.js](server/index.js) with route mounting for users, tasks, attendance, company, leaves, notifications, messages, meeting notes, scrum, holidays.
- MongoDB is required; `MONGODB_URI` must be set. Server listens on `PORT` (default 5006). See [server/index.js](server/index.js).
- User auth uses `/api/auth/login`, `/api/auth/change-password`, `/api/auth/reset-link`, `/api/auth/reset-password`. Login accepts `identifier` (userId or username). See [server/index.js](server/index.js).
- User role is stored as a string (`admin|owner|staff`) in Mongo; frontend expects role objects (e.g., `{ admin: null }`), so conversions happen in `useActor`. See [server/models/User.js](server/models/User.js) and [frontend/src/hooks/useActor.js](frontend/src/hooks/useActor.js).
- Avatar uploads use `multer` and are served from `/uploads`; endpoint: `POST /api/users/:userId/avatar`. See [server/index.js](server/index.js).

## Frontend conventions
- Auth state is local + backend validation: `useCustomAuth` stores identities in localStorage (`db_auth_v4`, `current_user`) and validates credentials via `/api/auth/login`. See [frontend/src/hooks/useCustomAuth.jsx](frontend/src/hooks/useCustomAuth.jsx).
- `useActor` currently initializes the HTTP actor (not the mock actor). The mock actor exists for localStorage-only mode but is not used by default. See [frontend/src/hooks/useActor.js](frontend/src/hooks/useActor.js).
- React Query is configured with retries disabled and no refetch-on-focus/reconnect in [frontend/src/main.jsx](frontend/src/main.jsx). Prefer adding new queries/mutations via [frontend/src/hooks/useQueries.js](frontend/src/hooks/useQueries.js).
- Module UI is organized under [frontend/src/components/modules/](frontend/src/components/modules/) and routed via state in [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx).
- Data type mapping: several actor methods convert dates to ISO strings and map BigInt fields (tasks/attendance/scrum). Follow the existing serialization patterns in [frontend/src/hooks/useActor.js](frontend/src/hooks/useActor.js) when adding new endpoints.

## Developer workflows
- Frontend: `npm install` then `npm run dev` (Vite on port 2000), `npm run build`, `npm run preview`. See [frontend/package.json](frontend/package.json).
- Backend: `npm install` then `npm run dev` (nodemon) or `npm start`. See [server/package.json](server/package.json).
- Health check endpoint: `GET /api/health` to confirm server + Mongo state. See [server/index.js](server/index.js).

## Integration points
- API base path is `/api` and proxied by Vite; keep new endpoints under the existing route folders in [server/routes/](server/routes/).
- Password reset links use `FRONTEND_BASE_URL` (fallback in code) to build the reset URL. See [server/index.js](server/index.js).
