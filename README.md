# 🤖 Bugbot

An automated GitHub pull-request review bot powered by OpenAI. When a PR is opened or updated, Bugbot fetches the diff, runs a multi-step LLM analysis pipeline, and posts inline review comments directly on the PR — identifying bugs, security issues, and performance problems before your team has to.

---

## How it works

1. **GitHub** sends a webhook when a PR is opened or updated
2. The **server** validates the request and enqueues a review job
3. The **worker** picks up the job, fetches the PR diff from GitHub
4. The diff is split into token-bounded chunks and run through an **OpenAI pipeline**:
   - Summarize what changed
   - Identify issues (bugs, security, performance, style)
   - Generate fix suggestions for bugs and security issues
5. Inline review comments are posted back to the PR

---

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **HTTP**: [Hono](https://hono.dev/)
- **Queue**: [BullMQ](https://bullmq.io/) + Redis
- **Database**: PostgreSQL + [Prisma](https://www.prisma.io/)
- **GitHub**: GitHub App (`@octokit/app`)
- **LLM**: OpenAI (`gpt-4.1-mini`, Responses API)
- **Logging**: [pino](https://getpino.io/)
- **Monorepo**: npm workspaces

---

## Project Structure

```
bugbot/
├── apps/
│   ├── server/   # Webhook ingestion + stats API
│   └── worker/   # BullMQ consumer + LLM review pipeline
└── packages/
    ├── config/   # Shared env, logger, redis config
    └── db/       # Prisma schema + migrations
```

---

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose
- A [GitHub App](https://docs.github.com/en/apps/creating-github-apps) with **Pull Requests** read/write permission and webhook subscribed to `pull_request` events
- An OpenAI API key

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/bugbot.git
cd bugbot
npm install
```

### 2. Configure environment

Create a `.env` file at the repo root:

```env
# PostgreSQL
DATABASE_URL="postgresql://bugbot:postgres@localhost:5432/BugBot"

# Redis
REDIS_URL="redis://:BugBot@localhost:6379"

# OpenAI
OPENAI_API_KEY="sk-..."

# GitHub App
GITHUB_WEBHOOK_SECRET="your-webhook-secret"
GITHUB_APP_ID="123456"
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# Optional
PORT=3000                  # Server port (default: 3000)
WORKER_HEALTH_PORT=3030    # Worker health port (default: 3030)
```

> For the private key, replace newlines with `\n` so the whole value fits on one line.

### 3. Start local infrastructure

```bash
docker-compose up -d
```

Starts PostgreSQL 16 on `:5432` and Redis 7 on `:6379`.

### 4. Run database migrations

```bash
npm -w @bugbot/db run prisma:migrate
```

### 5. Start the apps

In two separate terminals:

```bash
# Terminal 1 — HTTP server
npm run dev:server

# Terminal 2 — Background worker
npm run dev:worker
```

### 6. Expose webhook endpoint (local dev)

Use [ngrok](https://ngrok.com/) or [smee.io](https://smee.io/) to tunnel your local server:

```bash
ngrok http 3000
```

Set the webhook URL in your GitHub App settings to:
```
https://<your-tunnel>/webhook/github
```

---

## API

### Server (default port 3000)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/webhook/github` | GitHub webhook receiver |
| `GET` | `/stats/` | Review job counts by status |

### Worker (default port 3030)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Worker liveness check |

---

## Building for Production

```bash
npm run build
```

Compiles all packages in dependency order: `db` → `server` → `worker`. Output goes to each package's `dist/` directory.

---

## GitHub App Configuration

When creating your GitHub App:

- **Homepage URL**: your server URL
- **Webhook URL**: `https://your-server/webhook/github`
- **Webhook secret**: the value you set for `GITHUB_WEBHOOK_SECRET`
- **Permissions**:
  - Pull requests: Read & Write
  - Contents: Read
- **Subscribe to events**: `Pull request`

---
