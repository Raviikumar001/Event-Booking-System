# Virtual Event Backend — Plan & Architecture

## Overview
A Node.js + Express backend for a virtual event management platform using Postgres DB. It supports secure user registration and login (bcrypt + JWT), event CRUD (organizers only), attendee registration, and email notifications on successful registration. Designed to be simple, testable.

## API Documentation
- See the complete reference in [docs/api.md](docs/api.md).

## Goals
- Implement secure authentication with role-based authorization (organizer vs attendee).
- Manage events and participant lists in PostgreSQL using Prisma.
- Expose RESTful endpoints for users and events.
- Send background notifications (console + email) for booking confirmation and event updates.

## Tech Stack
- Runtime: Node.js (LTS)
- Framework: Express.js
- Database: PostgreSQL (Docker)
- ORM: Prisma (schema/migrations, PostgreSQL adapter)
- Auth: bcrypt (password hashing), jsonwebtoken (JWT)
- Email:(Resend)
- Config: dotenv
- Validation: zod (schema-based validation) or express-validator (alternative)
- Utilities: uuid (IDs), cors, morgan (logging)
- Testing: Jest + Supertest

## NPM Packages
Runtime:
- express
- bcrypt
- jsonwebtoken
- resend
- nodemailer
- dotenv
- cors
- morgan
- uuid
- zod (preferred) OR express-validator
- prisma
- @prisma/client

Dev:
- jest
- supertest

## High-Level Architecture
```
virtual-event/
├─ src/
│  ├─ app.js                 # Express app bootstrap
│  ├─ server.js              # HTTP server start
│  ├─ core/
│  │  ├─ env.js              # Load env variables
│  │  ├─ email-service.js    # Nodemailer config + send email
│  │  ├─ auth-middleware.js  # JWT verify, role guard
│  │  └─ error-handler.js    # Global error handling
│  ├─ models/
│  │  ├─ types.js            # JSDoc typedefs for User, Event
│  │  └─ prisma-client.js    # Prisma client singleton
│  ├─ services/
│  │  ├─ user-service.js     # Register/login, profile management
│  │  └─ event-service.js    # CRUD events + registration logic
│  ├─ routes/
│  │  ├─ auth-routes.js      # /register, /login
│  │  └─ event-routes.js     # /events CRUD + /events/:id/register
│  └─ utils/
│     └─ validators.js       # zod schemas for inputs
├─ prisma/
│  └─ schema.prisma          # Database schema and migrations
├─ tests/
│  ├─ auth.e2e.test.js
│  └─ events.e2e.test.js
├─ .env.example              # Document environment variables
├─ docker-compose.yml        # Postgres container
├─ README.md
└─ package.json
```


## Authentication & Authorization
- Registration hashes passwords with bcrypt and stores users in Postgres Db.
- Email is normalized (trim + lowercase) at registration/login to prevent duplicate accounts with case variants.
- Login returns a signed JWT with claims: `userId`, `role`, sent Email after valid user registration.
- Protected routes require `Authorization: Bearer <token>`.
- Event CRUD is restricted to `role = organizer`.
- Event registration is restricted to `role = attendee`.

## REST Endpoints
Auth:
- POST /register { email, password, role }
- POST /login { email, password }

Events:
- GET /events
- GET /events/:id
- POST /events (organizers only)
- PUT /events/:id (organizers only)
- DELETE /events/:id (organizers only)
- POST /events/:id/register (attendees only)

## Validation (zod schemas)
- `RegisterInput`: email (email), password (min length), role (enum: organizer|attendee)
- `LoginInput`: email, password
- `CreateEventInput`: title, description, date (YYYY-MM-DD), time (HH:mm)
- `UpdateEventInput`: same as create, all optional

## Email Notifications
- Background Task 1 (booking confirmation): on successful booking, enqueue async task that logs to console and sends booking confirmation email.
- Background Task 2 (event update notification): on event update, enqueue async task that logs to console and emails all booked attendees.
- Uses in-process async job queue (`src/core/job-queue.js`) and Nodemailer (Ethereal fallback in development).

## Async Operations
- Use `async/await` across services and route handlers.
- Background jobs are processed asynchronously via an in-process queue and do not block API responses.

## Environment Variables (.env)
- JWT_SECRET: secret for JWT signing
- EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS: SMTP credentials
- APP_BASE_URL: e.g., http://localhost:3000
- DATABASE_URL: Postgres connection string (Docker)
- EMAIL_FROM: sender email (e.g., no-reply@yourdomain.com)
- EMAIL_FROM_NAME: sender display name or an email (fallback when EMAIL_FROM not set)

Example `.env.example`:
```
JWT_SECRET=replace_me
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=your_user
EMAIL_PASS=your_pass
APP_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/virtual_event?schema=public
EMAIL_FROM=no-reply@yourdomain.com
EMAIL_FROM_NAME=Virtual Event
```

## Security Considerations
- Hash passwords with bcrypt (salt rounds constant e.g., 10).
- Sign JWTs with strong `JWT_SECRET`; set reasonable expiration (e.g., 1h).
- Validate inputs rigorously to prevent malformed data.
- Do not log sensitive info; use morgan for basic request logging.

## Testing Plan
- Jest + Supertest for E2E-style API tests.
- Arrange-Act-Assert per test.
- Cover: registration, login (token), event CRUD (authz), event registration, email send mock.


## Quick Start (after scaffolding)
```bash
# install deps
npm install

# run dev
npm run dev

# run tests
npm test

# start Postgres via Docker
docker compose up -d

# initialize Prisma
npx prisma generate
npx prisma migrate dev --name init

npx prisma studio

```

## Production Notes (Railway)

- `docker-compose.yml` in this repo is for local development only (local Postgres on `localhost:5433`).
- For Railway production deployment, set environment variables in Railway service settings:
	- `DATABASE_URL` (from Railway Postgres service)
	- `JWT_SECRET` (strong random secret)
	- `APP_BASE_URL` (your Railway app URL)
	- optional mail vars: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `EMAIL_FROM_NAME`
- The app now fails fast on startup/request if `DATABASE_URL` or `JWT_SECRET` are missing in production.

## Usage (API Examples)

For a complete, copy-paste flow with expected outputs, see [docs/curl-requests.md](docs/curl-requests.md).

Auth:
- Register (returns user; dev may include email diagnostics)
	curl -X POST http://localhost:3000/register \
		-H "Content-Type: application/json" \
		-d '{"email":"org@example.com","password":"StrongPass123","role":"organizer"}'

- Login (returns token)
	curl -X POST http://localhost:3000/login \
		-H "Content-Type: application/json" \
		-d '{"email":"org@example.com","password":"StrongPass123"}'

Events:
- Create event (organizer only)
	curl -X POST http://localhost:3000/events \
		-H "Authorization: Bearer YOUR_TOKEN" \
		-H "Content-Type: application/json" \
		-d '{"title":"Kickoff","description":"Project kickoff","date":"2026-02-01","time":"10:00"}'

- List events
	curl -X GET http://localhost:3000/events \
		-H "Authorization: Bearer YOUR_TOKEN"

- Get event
	curl -X GET http://localhost:3000/events/EVENT_ID \
		-H "Authorization: Bearer YOUR_TOKEN"

- Update event (organizer only)
	curl -X PUT http://localhost:3000/events/EVENT_ID \
		-H "Authorization: Bearer YOUR_TOKEN" \
		-H "Content-Type: application/json" \
		-d '{"description":"Updated description"}'
	# Response example:
	# {
	#   "updated": true,
	#   "event": { "id": "...", "title": "Kickoff", "date": "2026-02-02", "time": "11:30" },
	#   "backgroundNotification": { "queued": true, "recipientsCount": 1 }
	# }

- Delete event (organizer only)
	curl -X DELETE http://localhost:3000/events/EVENT_ID \
		-H "Authorization: Bearer YOUR_TOKEN"
	# Response example: { "deleted": true, "eventId": "EVENT_ID" }

- Register for event (attendee)
	curl -X POST http://localhost:3000/events/EVENT_ID/register \
		-H "Authorization: Bearer YOUR_TOKEN"
	# Response example (new registration):
	# {
	#   "success": true,
	#   "registered": true,
	#   "status": "registered",
	#   "message": "Ticket booked successfully for this event.",
	#   "event": { "id": "...", "title": "Kickoff", "date": "2026-02-01", "time": "10:00" },
	#   "backgroundConfirmation": { "queued": true }
	# }
	# Response example (already registered):
	# {
	#   "success": true,
	#   "registered": false,
	#   "status": "already-registered",
	#   "message": "You are already registered for this event.",
	#   "event": { "id": "...", "title": "Kickoff", "date": "2026-02-01", "time": "10:00" },
	#   "backgroundConfirmation": { "queued": false }
	# }

Participants & Registrations:
- List participants (organizer only)
	curl -X GET http://localhost:3000/events/EVENT_ID/participants \
		-H "Authorization: Bearer YOUR_TOKEN"

- My registrations
	curl -X GET http://localhost:3000/me/registrations \
		-H "Authorization: Bearer YOUR_TOKEN"

Admin (dev/test):
- Send test email (organizer only)
	curl -X POST http://localhost:3000/admin/test-email \
		-H "Authorization: Bearer YOUR_TOKEN" \
		-H "Content-Type: application/json" \
		-d '{"to":"you@example.com"}'

Notes:
- Replace YOUR_TOKEN with the JWT from the login response.
- Dates use YYYY-MM-DD; times use HH:mm.

