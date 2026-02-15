# Event Booking System — Requirement Gap Analysis

## Scope Checked
Target requirements:
- Two user types: Event Organizers and Customers
- Role-based API access
- Background task processing mechanism
- Background Task 1: Booking confirmation on successful booking (console log is enough)
- Background Task 2: Event update notification to all booked customers (console log is enough)

## Current Completion (Estimated)
- Overall: **~95% complete**

## What Is Already Implemented
1. **User roles exist**
   - `organizer` and `attendee` roles are supported (attendee maps to customer behavior).
2. **Role-based access for organizer management APIs**
   - Organizer-only checks are already applied for create/update/delete events and participants listing.
3. **Customer-like flow exists**
   - Attendees can browse events and register.
4. **Booking-triggered messaging exists (partially)**
   - Registration currently triggers email send logic.

## Remaining
1. **Optional hardening only (core requirements are implemented)**
   - Add tests that assert background jobs are enqueued for booking/update.
   - Consider moving from in-process queue to Redis/BullMQ for production reliability.

## How To Include Missing Parts (Minimal, Assignment-Friendly)

### 1) Customer-only Booking (Implemented)
- `POST /events/:id/register` now requires `ATTENDEE` role.

### 2) Background Processing Mechanism (Implemented)
- Added lightweight in-process queue in `src/core/job-queue.js` with:
   - `enqueueJob(name, payload)`
   - internal queue + async processor loop using `setImmediate`
   - console logging per job
- Job types implemented:
   - `BOOKING_CONFIRMATION`
   - `EVENT_UPDATED_NOTIFICATION`

### 3) Background Task 1 (Implemented)
- Trigger point: successful booking (`POST /events/:id/register`).
- Queue action: enqueues `BOOKING_CONFIRMATION` job.
- Worker behavior:
   - Console logs for trigger + result
   - Sends booking confirmation email to booked customer

### 4) Background Task 2 (Implemented)
- Trigger point: successful event update (`PUT /events/:id`).
- Queue action: enqueues `EVENT_UPDATED_NOTIFICATION` with event info + recipients list.
- Worker behavior:
   - Console logs for trigger + per-recipient result
   - Sends update notification email to all booked customers

### 5) Keep API Response Fast and Stable
- API should return success without waiting for notification jobs to complete.
- Job errors should be logged and not fail already-successful API requests.

## Implemented File Changes
1. `src/routes/event-routes.js`
   - Enforced attendee-only booking.
   - Replaced inline email send with booking job enqueue.
   - Added event-update notification job enqueue.
2. `src/services/event-service.js`
   - `updateEvent` now returns updated event summary.
   - Added helper to list registered attendee emails.
3. `src/core/job-queue.js` (new)
   - In-process queue + processors for both background tasks.
4. `src/core/email-service.js`
   - Added event-updated email sender helper.
5. `src/core/email-templates.js`
   - Added event-updated email template.

## Acceptance Checklist
- [ ] Organizer can manage events (already true)
- [x] Customer can browse and book
- [x] Organizer cannot book tickets
- [x] Booking triggers background confirmation job log
- [x] Booking triggers background confirmation email
- [x] Event update triggers background notification job log for booked customers
- [x] Event update triggers background notification emails to booked customers
- [x] API responses do not block on job execution

## Notes
- "Attendee" in current code can be treated as "Customer" for this requirement.
- If you want a production-ready queue, migrate later to BullMQ + Redis; for assignment scope, in-process async queue is sufficient.
