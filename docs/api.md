# API reference

Base path: `/api` (served by the gateway). JSON in and out. Errors share one shape:

```json
{ "error": "validation_error", "message": "Invalid request", "details": [{ "path": "email", "message": "Invalid email" }] }
```

`error` is one of `validation_error`, `request_error`, `rate_limited`, `not_found`, `bad_gateway`, `internal_error`. Authenticated routes need `Authorization: Bearer <token>`.

Dates are `YYYY-MM-DD` strings in the user's local calendar.

## Auth

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ email, password (8-128), fullName (1-80), locale? }` | `201 { token, user }` · `409` email taken |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` · `401` |
| GET | `/auth/me` | none | `{ user }` |
| PATCH | `/auth/me` | `{ fullName?, locale? }` (`en`\|`fr`\|`ar`) | `{ user }` |

`user` is `{ id, email, fullName, locale }`.

## Habits

`Entry` is `{ date, mood, waterGlasses, sleepHours, activityMinutes }` where `mood` is `very_low | low | neutral | good | great | null`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/habits/entries?from=&to=` | Up to 366 days. `{ entries }` |
| GET | `/habits/entries/:date` | `{ entry }` (`null` if nothing logged) |
| PUT | `/habits/entries/:date` | Upsert. Any of `mood`, `waterGlasses` (0-30), `sleepHours` (0-24, steps of 0.5), `activityMinutes` (0-600). Omitted fields keep their value. Future dates beyond tomorrow (UTC) are rejected. |
| GET | `/habits/summary/week?start=` | Week containing `start`, Monday to Sunday. `{ weekStart, days[{date, entry, completion}], loggedDays, averages, moodCounts, goals }` |
| GET | `/habits/streak?today=` | `{ streak }` consecutive complete days (each metric at least 75% of its goal) |
| GET | `/habits/goals` | `{ goals: { waterGlasses, sleepHours, activityMinutes } }` (defaults 8 / 8 / 60) |
| PUT | `/habits/goals` | Same shape; water 1-30, sleep 1-16, activity 5-600 |

## Chat

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/chat/conversations` | Newest first, up to 100. `{ conversations[{id, title, updatedAt}] }` |
| POST | `/chat/conversations` | `{ title? }` → `201 { conversation }` |
| DELETE | `/chat/conversations/:id` | `204` |
| GET | `/chat/conversations/:id/messages` | `{ messages[{id, role, content, feedback, createdAt}] }` |
| POST | `/chat/conversations/:id/messages` | Streams the reply (see below) |
| PUT | `/chat/messages/:id/feedback` | `{ value: "helpful" \| "not_helpful" }` → `204` |

### Sending a message

Request body:

```json
{
  "content": "I slept badly this week",
  "mood": "low",
  "locale": "en",
  "useHabitData": true,
  "today": "2026-10-24"
}
```

`content` is 1-2000 characters. `mood`, `locale` (default `en`), `useHabitData` (default `false`) and `today` are optional.

Response is `text/event-stream`:

| Event | Data | Meaning |
| --- | --- | --- |
| `user` | `{ id }` | Stored id of the user message |
| `safety` | `{ level: "crisis" }` | Message may signal a crisis; show support resources |
| `delta` | `{ text }` | Next chunk of the reply |
| `done` | `{ id }` | Stored id of the complete assistant message |
| `error` | `{ message }` | The reply could not be completed |

Browsers can't use `EventSource` for POST; read the body with `fetch` and a stream reader (see `frontend/src/lib/sse.ts`).

## Operations

`GET /api/health` returns `200 { status: "ok", services: { auth, habits, chat } }`, or `503` with `degraded` if any service is down. `GET /healthz` is the gateway's own liveness probe.
