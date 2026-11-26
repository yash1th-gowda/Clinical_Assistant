# Deployment and local container notes

## Before deploying

This repository is a student project and has not been security-audited or clinically validated. Do not deploy it with real patient data or rely on its ADR output for clinical decisions.

The checked-in Render blueprint is a starting configuration, not proof that the application is currently deployed or production-ready. Review every service, environment variable, access policy, and database setting in the hosting dashboard before deploying.

## Local Docker Compose

The root Compose file starts the Node backend, MongoDB, and the experimental Flask ADR service.

1. Install Docker Engine and the Docker Compose plugin.
2. Copy the root environment template:

   ```bash
   cp .env.example .env
   ```

3. Generate two different random secrets and set `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` in `.env`.
4. Start the services:

   ```bash
   docker compose up --build -d
   docker compose ps
   docker compose logs -f backend
   ```

5. The backend listens on `http://127.0.0.1:5001`. MongoDB and the ML prototype are reachable only inside the Compose network; neither is published on a host port.

Stop the stack:

```bash
docker compose down
```

The database is stored in the named `mongodb_data` volume. Removing it with `docker compose down -v` permanently deletes that local database.

## Hosted deployment checklist

Before exposing any service publicly:

- Store all secrets in the host's secret manager; never commit them.
- Use unique, high-entropy access-token, refresh-token, and reminder-link secrets.
- Use a managed MongoDB deployment with authentication, TLS, network restrictions, backups, and least-privilege database credentials.
- Do not expose MongoDB to the public internet.
- Configure the exact frontend origin in `CORS_ORIGIN`.
- Terminate HTTPS at a trusted reverse proxy or hosting platform.
- Configure email, SMS, WhatsApp, and Cloudinary credentials only if those integrations are enabled.
- Restrict access to the Flask ADR prototype. It uses synthetic training data and is not a clinically validated model.
- Review authentication and authorization for every route before handling sensitive data.
- Add monitoring, backup restoration tests, dependency updates, and incident-response procedures.

## Required backend environment

See `backend/.env.example` for the complete variable template. The core settings are:

- `PORT`
- `MONGODB_URI`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ACCESS_TOKEN_EXPIRY`
- `REFRESH_TOKEN_EXPIRY`
- `JWT_SECRET`
- `CORS_ORIGIN`

## Troubleshooting

- **Backend cannot connect to MongoDB:** verify `MONGODB_URI` and that the database is reachable from the backend's network.
- **CORS errors:** make sure `CORS_ORIGIN` exactly matches the browser origin, including scheme and port.
- **Authentication errors:** verify that access-token and refresh-token secrets are set consistently across backend instances.
- **Docker port conflicts:** check whether port 5001 is already in use on the host.
- **Notification failures:** confirm the relevant provider credentials and enablement settings; these integrations are optional.
