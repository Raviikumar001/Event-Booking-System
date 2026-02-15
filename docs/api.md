# Virtual Event API Reference

Base URL: `APP_BASE_URL` (default: `http://localhost:3000`)

## Overview
RESTful API for user authentication, event management, and participant registrations. Requires JWT Bearer auth for protected endpoints.

## Authentication
- Obtain a token via `POST /login`.
- Send the token in the `Authorization` header: `Bearer <token>`.
- Roles: `ORGANIZER` (can manage events) and `ATTENDEE` (can register for events).

## Error Format
- Validation errors (Zod):
```json
{
  "error": "Validation failed",
  "issues": [{ "path": ["field"], "message": "reason" }]
}
```
- General errors:
```json
{ "error": "Message" }
```
- Common status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Internal Server Error.

## Health
GET /health
- Response:
```json
{ "status": "ok" }
```

## Auth
POST /register
- Description: Create a user (organizer or attendee). Dev responses may include email diagnostics.
- Request (JSON):
```json
{ "email": "user@example.com", "password": "StrongPass123", "role": "organizer" }
```
- Response 201:
```json
{ "user": { "id": "uuid", "email": "user@example.com", "role": "ORGANIZER" }, "emailPreviewUrl": "optional", "emailProvider": "optional", "emailError": "optional" }
```
- Errors: 409 if email exists; 400 validation.

POST /login
- Description: Login and receive JWT.
- Request (JSON):
```json
{ "email": "user@example.com", "password": "StrongPass123" }
```
- Response 200:
```json
{ "token": "jwt", "user": { "id": "uuid", "email": "user@example.com", "role": "ORGANIZER" } }
```
- Errors: 401 invalid credentials; 400 validation.

## Events
GET /events
- Auth: Bearer token required.
- Response 200:
```json
{ "events": [ { "id": "uuid", "title": "Kickoff", "description": "...", "date": "2026-02-01", "time": "10:00", "organizerId": "uuid", "participants": 3 } ] }
```

GET /events/:id
- Auth: Bearer token required.
- Response 200:
```json
{ "event": { "id": "uuid", "title": "Kickoff", "description": "...", "date": "2026-02-01", "time": "10:00", "organizerId": "uuid", "participants": ["att@example.com"] } }
```
- Errors: 404 not found.

POST /events
- Auth: Organizer only.
- Request (JSON):
```json
{ "title": "Kickoff", "description": "Project kickoff", "date": "2026-02-01", "time": "10:00" }
```
- Response 201:
```json
{ "id": "uuid" }
```
- Errors: 403 forbidden, 400 validation.

PUT /events/:id
- Auth: Organizer only.
- Request (JSON): any subset of create fields.
- Response 204.
- Errors: 404 not found, 403 forbidden, 400 validation.

DELETE /events/:id
- Auth: Organizer only.
- Response 204.
- Errors: 404 not found, 403 forbidden.

POST /events/:id/register
- Auth: Any authenticated user.
- Response 200:
```json
{ "registered": true, "emailPreviewUrl": "optional", "emailProvider": "optional", "emailError": "optional" }
```
- Errors: 404 event not found.

GET /events/:id/participants
- Auth: Organizer only.
- Response 200:
```json
{ "participants": ["attendee1@example.com", "attendee2@example.com"] }
```
- Errors: 404 not found, 403 forbidden.

## User
GET /me/registrations
- Auth: Bearer token required.
- Response 200:
```json
{ "registrations": [ { "id": "uuid", "title": "Kickoff", "date": "2026-02-01", "time": "10:00" } ] }
```

## Admin (Dev/Test)
POST /admin/test-email
- Auth: Organizer only.
- Request (JSON):
```json
{ "to": "you@example.com" }
```
- Response 200:
```json
{ "ok": true, "emailPreviewUrl": "optional", "emailProvider": "optional" }
```
- Errors: 400 missing `to`, 502 provider error.

## Headers
- `Authorization: Bearer <token>` for protected endpoints.
- `Content-Type: application/json` for JSON bodies.

## Notes
- Date format: `YYYY-MM-DD`
- Time format: `HH:mm`
- Roles are set on registration: `role`: `organizer` or `attendee` (lowercase); returned as `ORGANIZER`/`ATTENDEE`.
- Dev responses may include `emailPreviewUrl` (Ethereal) or `emailError` (SMTP issues).