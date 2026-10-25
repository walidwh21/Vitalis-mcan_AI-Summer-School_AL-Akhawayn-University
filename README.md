<div align="center">

<img src="frontend/public/favicon.svg" width="72" alt="Vitalis logo" />

# Vitalis

**A multilingual wellness companion: track daily habits, review your week, and talk things through with an AI assistant**

![React](https://img.shields.io/badge/React_18-20232a?logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node_22-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169e1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-2496ed?logo=docker&logoColor=white)

</div>

---

## Preview

| Landing | Dashboard |
| :---: | :---: |
| ![Landing page](docs/screenshots/landing.png) | ![Dashboard](docs/screenshots/dashboard.png) |
| **Daily log** | **Weekly insights** |
| ![Daily habit log](docs/screenshots/habits.png) | ![Weekly charts](docs/screenshots/weekly.png) |
| **AI assistant** | **Wellness toolkit** |
| ![Assistant chat](docs/screenshots/assistant.png) | ![Wellness toolkit](docs/screenshots/wellness.png) |

## Features

- **Daily habit log** for water, sleep, activity and mood, with sliders, quick +/- buttons and live progress against your own goals
- **Weekly insights**: per-metric charts with goal lines, averages over logged days, mood distribution and week-by-week navigation
- **Streaks** that count consecutive days on which every metric reaches 75% of its goal (and don't reset before you've had a chance to log today)
- **AI assistant** with streamed replies, saved conversation history, per-reply feedback, and an opt-in switch to use your recent habit summary as context
- **Safety net**: messages that may signal a crisis trigger an on-screen support banner and a more careful assistant response
- **Wellness toolkit** of short self-care practices grouped by stress, anxiety, low mood and low energy
- **English, French and Arabic** with full right-to-left layout, plus light, dark and system themes
- **Customisable daily goals** that drive the dashboard, streaks and charts

## Architecture

Vitalis is a small set of single-purpose services behind one gateway. The browser only ever talks to the frontend host; nginx (or the Vite dev server) forwards `/api/*` to the gateway

![Architecture diagram](docs/diagrams/architecture.svg)

| Service | Port | Responsibility |
| --- | :---: | --- |
| **frontend** | 3000 (dev 5173) | React SPA served by nginx, same-origin proxy to the gateway |
| **gateway** | 8080 | CORS, rate limiting, JWT pre-check, routing, aggregated health |
| **auth-service** | 4001 | Registration, login (bcrypt), JWT issuing, profile |
| **habits-service** | 4002 | Daily entries, goals, weekly summaries, streaks, internal summary endpoint |
| **chat-service** | 4003 | Conversations, message history, AI provider abstraction, SSE streaming, crisis screening |
| **db** | 5432 | One PostgreSQL instance; each service owns its own schema |

Design notes:

- **Schema per service.** `auth_svc`, `habits_svc` and `chat_svc` never join across schemas; services reference users only by id. Each service creates its own tables on startup (idempotent, guarded by an advisory lock), so there is no shared migration step
- **Defence in depth.** The gateway checks the token, and each service verifies it again. Only the gateway and frontend publish ports; `/internal/*` routes require an `x-internal-key` header and are never proxied
- **Calendar dates are strings.** The browser decides what "today" is and sends it explicitly; the server does UTC-only calendar maths on `YYYY-MM-DD`, which avoids timezone off-by-one bugs

### How a chat message flows

![Chat sequence diagram](docs/diagrams/chat-sequence.svg)

### Data model

![Data model](docs/diagrams/data-model.svg)

## Quick start

Requirements: Docker with Compose v2

```bash
git clone <your-repo-url> vitalis && cd vitalis
cp .env.example .env
```

Edit `.env` and set the three secrets (everything else has a default):

```bash
# generate values
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 24   # INTERNAL_API_KEY
# choose any strong POSTGRES_PASSWORD
```

Start everything:

```bash
docker compose up --build
```

Open **http://localhost:3000**, create an account, and log your first day.

> With `AI_API_KEY` left empty the assistant runs on an **offline mock provider** (canned, mood-aware replies) so the whole app works out of the box. See [AI chatbot](#ai-chatbot) to connect a real model

Handy checks:

```bash
curl http://localhost:8080/api/health     # per-service status
docker compose logs -f chat-service       # see which AI provider is active
```

## Configuration

All configuration is via environment variables (see [`.env.example`](.env.example))

| Variable | Default | Description |
| --- | --- | --- |
| `POSTGRES_USER` / `POSTGRES_DB` | `vitalis` | Database credentials |
| `POSTGRES_PASSWORD` | *required* | Database password |
| `JWT_SECRET` | *required* | Signing key, at least 32 characters |
| `INTERNAL_API_KEY` | *required* | Service-to-service key, at least 16 characters |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `AI_PROVIDER` | `anthropic` | `anthropic`, `openai` (any OpenAI-compatible API) or `mock` |
| `AI_API_KEY` | empty | Provider key; empty falls back to the mock provider |
| `AI_MODEL` | provider default | Model name |
| `AI_BASE_URL` | provider default | Custom endpoint, for proxies or local servers |
| `AI_MAX_TOKENS` | `600` | Maximum reply length |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Only needed for cross-origin API calls |

Tunable per service (see each `config.ts`): `MESSAGES_PER_MINUTE`, `HISTORY_MAX_MESSAGES`, `HISTORY_MAX_CHARS`, `AI_TIMEOUT_MS`, `RATE_LIMIT_PER_MINUTE`, `BCRYPT_COST`, `TRUST_PROXY`

## AI chatbot

The chat-service talks to models through a small `AiProvider` interface that yields text chunks, so providers are interchangeable.

| Provider | Set | Notes |
| --- | --- | --- |
| Anthropic | `AI_PROVIDER=anthropic`, `AI_API_KEY=...` | Messages API with streaming. Default model `claude-sonnet-5-5`; override with `AI_MODEL`. |
| OpenAI-compatible | `AI_PROVIDER=openai`, `AI_API_KEY=...` | OpenAI, OpenRouter, vLLM, LM Studio, Ollama. For a local server set `AI_BASE_URL` (e.g. `http://host.docker.internal:11434/v1`) and `AI_MODEL`; no key needed. |
| Mock | `AI_PROVIDER=mock` | Offline canned replies for development and demos. Not an AI. |

What the service does around the model:

- **Streaming.** Replies are relayed to the browser as Server-Sent Events (`user`, `safety`, `delta`, `done`, `error`) and stored when complete. If the browser disconnects, the upstream request is aborted and any partial reply is kept
- **System prompt.** Defines a warm, brief, non-clinical wellness companion that never diagnoses or advises on medication, replies in the user's language, and avoids guilt about missed goals
- **Optional habit context.** Only when the user flips *Use my habit data for context*, the service fetches a compact 7-day summary from habits-service and adds it to the prompt as clearly delimited data. If habits-service is slow or down the chat simply continues without it
- **Crisis screening.** A multilingual keyword screen flags possible self-harm language. The UI shows a support banner and the prompt switches to a care-first protocol that points to local emergency services and [findahelpline.com](https://findahelpline.com). This is a safety net, not a classifier
- **Limits.** 2,000 characters per message, a per-user message rate limit, and a bounded history window

> Vitalis offers general wellness support. It is not a medical device and does not replace professional care

## API overview

All routes are under `/api` and, except `register`/`login`, need `Authorization: Bearer <token>`. Full request and response shapes are in [`docs/api.md`](docs/api.md).

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/me` |
| Habits | `GET /habits/entries?from&to`, `GET\|PUT /habits/entries/:date`, `GET /habits/summary/week?start`, `GET /habits/streak?today`, `GET\|PUT /habits/goals` |
| Chat | `GET\|POST /chat/conversations`, `DELETE /chat/conversations/:id`, `GET /chat/conversations/:id/messages`, `POST /chat/conversations/:id/messages` (SSE), `PUT /chat/messages/:id/feedback` |
| Ops | `GET /api/health` (gateway and services) |

## Project structure

```text
vitalis/
├── docker-compose.yml
├── .env.example
├── docs/
│   ├── api.md                    # endpoint reference
│   ├── diagrams/                 # Mermaid sources (.mmd) and rendered SVG/PNG
│   └── screenshots/
├── frontend/                     # React + Vite + Tailwind
│   └── src/
│       ├── app/                  # routes
│       ├── components/           # ui primitives, layout shell
│       ├── features/             # auth, dashboard, habits, assistant, wellness, settings, landing
│       ├── i18n/                 # en / fr / ar catalogues, RTL handling
│       └── lib/                  # api client, SSE reader, dates, theme
├── services/
│   ├── gateway/                  # edge: CORS, rate limits, JWT pre-check, proxy
│   ├── auth-service/             # accounts + tokens
│   ├── habits-service/           # entries, goals, summaries, streaks
│   │   └── src/domain/           # pure date / streak / weekly logic (unit tested)
│   └── chat-service/
│       └── src/
│           ├── ai/               # providers: anthropic, openai-compatible, mock; SSE decoding
│           └── lib/              # prompt, crisis screen, history, rate limiter (unit tested)
└── scripts/
    ├── screenshots.mjs           # live screenshots from a running stack
    └── preview/                  # static UI previews used for the images above
```

## Development and testing

Run the stack in containers (above), or run services locally against a Postgres you provide

```bash
npm run install:all          # install every package
docker compose up -d db      # just the database (add a ports mapping to reach it from the host)
```

Each service reads its configuration from the environment; for example:

```bash
cd services/auth-service
DATABASE_URL=postgresql://vitalis:secret@localhost:5432/vitalis \
JWT_SECRET=$(openssl rand -hex 32) npm run dev
```

Start the other services the same way (`habits-service` and `chat-service` also need `INTERNAL_API_KEY`; the gateway needs `JWT_SECRET` plus the service URLs, e.g. `AUTH_SERVICE_URL=http://localhost:4001`). Then run `npm run dev` in `frontend/`; Vite forwards `/api` to `http://localhost:8080` (override with `VITE_DEV_PROXY_TARGET`).

```bash
npm test                     # frontend (Vitest) + habits-service + chat-service
npm run typecheck            # all packages
npm run screenshots          # live screenshots into docs/screenshots (stack must be running)
```

The pure logic is covered by tests: date and streak maths, weekly summaries, SSE parsing, provider stream decoding, prompt building, crisis detection, history trimming, rate limiting, and translation-catalogue parity.

Because the repository ships without lockfiles, run `npm install` once in each package and commit the generated `package-lock.json` files for reproducible builds (the Dockerfiles use `npm install`; switch them to `npm ci` afterwards).

## Security and privacy

- Passwords are hashed with bcrypt; login compares against a dummy hash for unknown emails to even out timing
- Tokens are HS256 JWTs verified with a pinned algorithm list; secrets are required at startup and never defaulted
- Credential endpoints have a strict rate limit; all routes have a general one; chat has a per-user limit
- Every query is parameterised, request bodies are validated with Zod, and responses render AI text as plain text (never HTML)
- Data access is scoped by the authenticated user id in every query; message feedback is limited to the caller's own assistant messages.
- Habit data reaches the AI provider only when the user opts in, and only as a short aggregate summary
- Mind the trade-offs: the token lives in `localStorage` (simple, but exposed to XSS; consider httpOnly cookies for hardened deployments), and the registration endpoint reveals whether an email is already taken

## Roadmap

- Refresh tokens and httpOnly cookie sessions
- Account deletion that fans out to every service (event-driven)
- Shared rate-limit store (Redis) for multi-instance deployments
- Push or email reminders
- Conversation summaries to extend assistant memory cheaply
- Observability: request ids across services, metrics, tracing
