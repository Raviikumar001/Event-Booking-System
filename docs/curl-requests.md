# Event Booking API — cURL Requests

## Base Variables

```bash
BASE_URL="http://localhost:3000"
ORG_EMAIL="organizer.demo@example.com"
ORG_PASSWORD="StrongPass123"
ATT_EMAIL="customer.demo@example.com"
ATT_PASSWORD="StrongPass123"
```

## 1) Register Organizer

```bash
curl -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$ORG_EMAIL"'","password":"'"$ORG_PASSWORD"'","role":"organizer"}'
```

## 2) Login Organizer

```bash
curl -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$ORG_EMAIL"'","password":"'"$ORG_PASSWORD"'"}'
```

Copy `token` from response into:

```bash
ORG_TOKEN="PASTE_ORGANIZER_TOKEN"
```

## 3) Register Customer (Attendee)

```bash
curl -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$ATT_EMAIL"'","password":"'"$ATT_PASSWORD"'","role":"attendee"}'
```

## 4) Login Customer (Attendee)

```bash
curl -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$ATT_EMAIL"'","password":"'"$ATT_PASSWORD"'"}'
```

Copy `token` from response into:

```bash
ATT_TOKEN="PASTE_ATTENDEE_TOKEN"
```

## 5) Organizer Creates Event

```bash
curl -X POST "$BASE_URL/events" \
  -H "Authorization: Bearer $ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Backend Assignment Event","description":"Initial schedule","date":"2026-03-01","time":"10:00"}'
```

Copy returned `id` into:

```bash
EVENT_ID="PASTE_EVENT_ID"
```

## 6) List Events (Authenticated)

```bash
curl -X GET "$BASE_URL/events" \
  -H "Authorization: Bearer $ATT_TOKEN"
```

## 7) Get Event By ID

```bash
curl -X GET "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ATT_TOKEN"
```

## 8) Customer Books Ticket (Background Task 1)

```bash
curl -X POST "$BASE_URL/events/$EVENT_ID/register" \
  -H "Authorization: Bearer $ATT_TOKEN"
```

Expected:
- API response (first booking):

```json
{
  "success": true,
  "registered": true,
  "status": "registered",
  "message": "Ticket booked successfully for this event.",
  "event": {
    "id": "EVENT_ID",
    "title": "Backend Assignment Event",
    "date": "2026-03-01",
    "time": "10:00"
  },
  "backgroundConfirmation": {
    "queued": true
  }
}
```

- API response (if customer calls same booking API again):

```json
{
  "success": true,
  "registered": false,
  "status": "already-registered",
  "message": "You are already registered for this event.",
  "event": {
    "id": "EVENT_ID",
    "title": "Backend Assignment Event",
    "date": "2026-03-01",
    "time": "10:00"
  },
  "backgroundConfirmation": {
    "queued": false
  }
}
```
- Server console logs (background):
  - `[JOB] Booking confirmation triggered ...`
  - `[JOB] Booking confirmation email sent ...`

## 9) Organizer Booking Attempt Should Fail (Role Check)

```bash
curl -i -X POST "$BASE_URL/events/$EVENT_ID/register" \
  -H "Authorization: Bearer $ORG_TOKEN"
```

Expected: `403 Forbidden`

## 10) Organizer Updates Event (Background Task 2)

```bash
curl -X PUT "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated schedule","date":"2026-03-02","time":"11:30"}'
```

Expected:
- API response: `200 OK` with JSON body, for example:

```json
{
  "updated": true,
  "event": {
    "id": "EVENT_ID",
    "title": "Backend Assignment Event",
    "date": "2026-03-02",
    "time": "11:30"
  },
  "backgroundNotification": {
    "queued": true,
    "recipientsCount": 1
  }
}
```
- Server console logs (background):
  - If attendees already booked this event:
    - `[JOB] Event update notification triggered ...`
    - `[JOB] Event update email sent ...` (for each booked customer)
  - If no one booked yet:
    - `[JOB] Event update notification skipped: no recipients ...`

Tip to see status + response headers:

```bash
curl -i -X PUT "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated schedule","date":"2026-03-02","time":"11:30"}'
```

## 11) Organizer Lists Participants

```bash
curl -X GET "$BASE_URL/events/$EVENT_ID/participants" \
  -H "Authorization: Bearer $ORG_TOKEN"
```

## 12) Customer Lists Own Registrations

```bash
curl -X GET "$BASE_URL/me/registrations" \
  -H "Authorization: Bearer $ATT_TOKEN"
```

## 13) Optional: Organizer Deletes Event

```bash
curl -X DELETE "$BASE_URL/events/$EVENT_ID" \
  -H "Authorization: Bearer $ORG_TOKEN"
```

Expected: `200 OK` with JSON body, for example:

```json
{ "deleted": true, "eventId": "EVENT_ID" }
```
