# Smart Care Assistant — Frontend

The web client for Smart Care Assistant, built with Next.js 15 and React 19.

## Requirements

- Node.js 20+
- npm
- A running Smart Care Assistant backend

## Setup

Install dependencies:

```bash
npm ci
```

Create `.env.local` in this directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5002/api
```

Start the development server on port 3001 (the backend's default CORS origin):

```bash
npm run dev -- --port 3001
```

Open http://localhost:3001.

## Available scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm start` — production server (run after building)
- `npm run lint` — ESLint

## Application areas

- `src/app/admin/` — administrator portal
- `src/app/doctor/` — doctor portal
- `src/app/patient/` — patient portal
- `src/components/` — shared UI components
- `src/context/` — application context
- `src/utils/` — API, authentication, and route helpers

The application requires the backend API and its configured services. See the repository-root README for full-stack setup and the medical-use disclaimer.
