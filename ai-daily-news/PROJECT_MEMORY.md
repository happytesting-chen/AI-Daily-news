# PROJECT_MEMORY.md

Project-scoped memory for **AI Daily News**.

Use this file for durable facts that matter across future work on this project.
Keep it clean, factual, and low-noise.
Do not store live secrets here.

## Purpose

Track stable project context that should not live in general personal memory.
Examples:
- architecture decisions
- deployment assumptions
- cron design
- known tradeoffs
- recurring maintenance notes

## Current Snapshot

- Project: AI Daily News
- Stack: Vite + React frontend, Vercel serverless API routes, Redis snapshot storage
- Primary scheduled workflow:
  - `/api/refresh?sendTelegram=0` at 07:40 Singapore time
  - `/api/send-telegram` at 08:00 Singapore time
  - `/api/enrich-images` at 08:10 Singapore time
- Telegram notification is sent from `/api/send-telegram`
- Image enrichment was split into a separate endpoint to reduce cron timeout risk

## Decisions

### Cron split
- Decision: split the old single refresh flow into multiple stages
- Why: `FUNCTION_INVOCATION_TIMEOUT` occurred when generation and image enrichment ran in the same Vercel function, and message delivery needed to happen exactly at 08:00 Singapore time
- Result:
  - `/api/refresh?sendTelegram=0` pre-generates the snapshot at 07:40
  - `/api/send-telegram` sends the user-facing Telegram message at 08:00 sharp
  - `/api/enrich-images` runs afterward and enriches OG images separately

### Secrets handling
- Real local secrets existed in the original non-workspace project directory under `.env` and `.env.development.local`
- Those secrets were intentionally not copied into this workspace repo
- Workspace repo now ignores common local secret files via `.gitignore`
- Do not place live tokens in repo docs or memory files

## Content Rules

- For `AI System Security`, `AI for Defense`, and `AI-Powered Attacks`, check the article date before summarizing
- If one of those stories is older than 24 hours at generation time, exclude it and do not summarize it
- Only `AI New Releases` may include items up to 7 days old

## Operational Notes

- Required runtime env vars include:
  - `ANTHROPIC_API_KEY`
  - `REDIS_URL`
  - `CRON_SECRET`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`
- Optional, depending on feature use:
  - `OPENAI_API_KEY`
- If the Telegram message is missing, check:
  1. Vercel cron execution
  2. `/api/refresh` logs
  3. Anthropic latency or quota
  4. Redis connectivity
  5. Telegram API response

## Guardrails

- Never commit `.env`, `.env.local`, `.env.*.local`, or `.vercel/`
- Never store real tokens in `PROJECT_MEMORY.md`, `DEPLOYMENT.md`, or `INCIDENTS.md`
- Prefer recording process and decisions, not secrets
