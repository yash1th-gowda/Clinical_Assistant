# Smart Care Assistant

A full-stack healthcare workflow project with separate Admin, Doctor, and Patient portals. The application supports patient records, appointments, prescriptions, vitals, medication logs, notifications, PDF reports, and an experimental adverse drug reaction (ADR) analysis module.

> **Important:** This is an educational software project, not a certified medical device or clinical decision-support system. ADR rules and the bundled ML model are simplified demonstrations and may be incomplete or inaccurate. Do not use their output to diagnose, prescribe, change medication, or make patient-care decisions. A qualified clinician must independently review all medical decisions.

## Repository layout

- `backend/` — Node.js, Express 5, MongoDB/Mongoose API
- `frontend/` — Next.js 15 / React 19 web application
- `ml-adr-service/` — experimental Flask ADR prediction service using a small synthetic training dataset
- `docker-compose.yml` — local container orchestration for the backend, MongoDB, and ML service

## Main capabilities

- Role-specific Admin, Doctor, and Patient interfaces
- Patient onboarding and profile management
- Appointment request and status workflows
- Prescription management and medication schedules
- Patient vitals and symptom records
- Scheduled medication logs and reminders
- PDF reports
- Experimental rule-based ADR checks and alert tracking

Some integrations (email, SMS, WhatsApp, Cloudinary) require provider credentials and configuration. The ML service is a separate prototype; do not assume it is a validated or authoritative medical model.

## Technology

| Layer | Technologies |
|---|---|
| Frontend | Next.js 15, React 19, Axios, Tailwind CSS |
| Backend | Node.js 20+, Express 5, Mongoose, JWT |
| Database | MongoDB |
| ML prototype | Python, Flask, scikit-learn |
| Integrations | Cloudinary, Nodemailer, Twilio, WhatsApp Business API |
| Containers | Docker, Docker Compose |

## Run locally

### Prerequisites

- Node.js 20 or later and npm
- MongoDB (local instance or hosted MongoDB URI)
- Python 3.9+ only if running the ML prototype outside Docker

### 1. Clone and install

```bash
git clone https://github.com/yash1th-gowda/Clinical_Assistant.git
cd Clinical_Assistant

cd backend
npm ci
cd ../frontend
npm ci
cd ..
```

### 2. Configure the backend

Copy `backend/.env.example` to `backend/.env` and set the values required by the features you want to run.

At minimum, configure:

- `PORT` (default: `5002`)
- `MONGODB_URI`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ACCESS_TOKEN_EXPIRY`
- `REFRESH_TOKEN_EXPIRY`
- `JWT_SECRET` (used by medication reminder action links)
- `CORS_ORIGIN`

Generate independent, high-entropy values for the token secrets. Never commit `.env` files, API keys, cookies, or production credentials.

### 3. Configure the frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5002/api
```

The backend's default CORS origin is `http://localhost:3001`, so run the frontend on port 3001 unless you change `CORS_ORIGIN`.

### 4. Start the backend

```bash
cd backend
npm run dev
```

### 5. Start the frontend

In another terminal:

```bash
cd frontend
npm run dev -- --port 3001
```

Open http://localhost:3001.

### Optional backend tasks

Create an initial administrator account (requires the setup values expected by the script):

```bash
cd backend
npm run create-admin
```

Run the medication-log scheduler as a separate process:

```bash
cd backend
npm run medication-logs
```

Do not run multiple scheduler instances against the same environment unless duplicate processing has been addressed.

## Docker Compose

For a local containerized backend and database:

1. Copy the root `.env.example` to `.env`.
2. Replace both required token secrets with independently generated values.
3. Run:

```bash
docker compose up --build
```

The backend is published on `127.0.0.1:5001`. MongoDB is not published to the host; it is reachable only by services on the Compose network. The ML service is also internal to that network.

To stop:

```bash
docker compose down
```

To remove the local database volume as well (this permanently deletes the Compose database data):

```bash
docker compose down -v
```

## API overview

The Express API is mounted under `/api`. Main route groups include:

- `/auth`
- `/patients`
- `/doctors`
- `/admin`
- `/appointments`
- `/prescriptions`
- `/vitals`
- `/medicationLogs`
- `/symptoms`
- `/notifications`
- `/summaries`
- `/adr`

ADR analysis and alert endpoints are restricted to authenticated doctors. A doctor must be assigned to the patient before requesting an ADR check.

## Security notes

- Use unique secrets for access tokens, refresh tokens, and medication reminder links.
- Keep `.env`, cookies, API keys, database exports, and patient data out of Git.
- Use HTTPS and appropriately secured managed database services for any hosted environment.
- Configure provider credentials only in the hosting platform's secret manager.
- Review `SECURITY.md` before deploying or contributing.

## Project status and limitations

This repository is a student/portfolio project. It has not been independently security-audited, clinically validated, or verified for production healthcare use. The ADR detection logic uses a small hand-maintained rule set; the Flask model is trained on a tiny synthetic dataset and must not be interpreted as reliable clinical prediction. Authentication and authorization coverage elsewhere in the application should be reviewed before any deployment containing real patient information.

## License

ISC
