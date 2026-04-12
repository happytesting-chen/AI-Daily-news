# AI Daily News

A daily AI news + AI security briefing, powered by Claude with web search. Built as a Vite + React app with a Vercel serverless function that proxies the Anthropic API (so your API key stays on the server, never in the browser).

## Architecture

```
Browser (React)
  ├─► Hacker News API  (direct fetch — public, CORS-friendly)
  └─► /api/news        (Vercel serverless function)
                          └─► api.anthropic.com  (web_search tool)
                                  └─► arXiv, NVD/CVE, CISA, blogs, etc.
```

A server-side refresh job builds one daily snapshot:
1. **Hacker News Algolia API** for AI community stories.
2. **Anthropic web search** for general AI news.
3. **Anthropic web search** for AI security news.
4. Results are saved into a server-side snapshot that the frontend reads.

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Set your API key
cp .env.example .env
# Then edit .env and paste your keys locally, never commit .env files

# 3. Run with Vercel CLI (so the serverless function works locally)
npm install -g vercel
vercel dev
```

Open http://localhost:3000 — the app will load the cached snapshot.

To generate or refresh the snapshot locally, call the refresh endpoint:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/refresh
```

> ⚠️ Plain `npm run dev` only runs the Vite frontend; the `/api/news` endpoint won't work. Use `vercel dev` for full local testing.

## Deploy to Vercel (5 minutes)

### One-time setup
1. Push this folder to a GitHub repo.
2. Go to https://vercel.com/new and import the repo.
3. Vercel auto-detects Vite. Click **Deploy**.
4. After the first deploy, go to **Project Settings → Environment Variables** and add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your key from https://console.anthropic.com/
   - **Environments:** Production, Preview, Development
5. In Vercel, add a **Redis storage integration** to the project and make sure it provides `REDIS_URL` to the deployment.
6. Trigger a redeploy (Deployments tab → click latest → Redeploy).

Done. You'll get a URL like `https://ai-daily-news-yourname.vercel.app` to share with your team.

### Daily refresh at 8:00 AM Singapore time

Add these environment variables in Vercel:
- **Name:** `CRON_SECRET`
- **Value:** a long random secret
- **Name:** `TELEGRAM_BOT_TOKEN`
- **Value:** your Telegram bot token
- **Name:** `TELEGRAM_CHAT_ID`
- **Value:** the Telegram DM/group chat id to notify

Also make sure the project has a Redis integration configured so the generated snapshot can persist between invocations, and that `REDIS_URL` is present in the deployment environment.

The project includes two Vercel cron jobs:
- `/api/refresh` at `0 0 * * *` → **8:00 AM Asia/Singapore**
- `/api/enrich-images` at `10 0 * * *` → **8:10 AM Asia/Singapore**

`/api/refresh` is the fast path:
- generates the news snapshot
- saves it
- sends the Telegram message immediately

`/api/enrich-images` runs separately after that and fills in OG images without blocking the Telegram notification.

Both endpoints accept either:
- a manual `Authorization: Bearer $CRON_SECRET` request, or
- a Vercel Cron invocation (`x-vercel-cron: 1`)

You can also trigger them manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-site.vercel.app/api/refresh
curl -H "Authorization: Bearer $CRON_SECRET" https://your-site.vercel.app/api/enrich-images
```

### Optional: custom domain
In Vercel project settings → Domains, add e.g. `news.yourteam.com` and follow the DNS instructions.

## Cost notes

Each refresh = 2 Claude API calls with web search enabled. Rough estimate with Sonnet 4.5:
- ~3-6k tokens per call (input + output + tool use)
- Web search has its own per-request cost
- Plan on ~$0.05-$0.15 per full refresh

For a team of 10 hitting refresh a few times a day, you're looking at low single-digit dollars per day. Set a usage budget in the Anthropic console if you want a hard cap.

## Customizing sources

Edit the prompts in `api/news.js`:
- `AI_NEWS_PROMPT` — general AI sources
- `SECURITY_NEWS_PROMPT` — security sources

You can add or remove sources, change the number of stories, or tweak the JSON schema. The frontend will pick up any new fields you add to story objects (just update `NewsCard` in `src/App.jsx` to render them).

## Project structure

```
ai-daily-news/
├── api/
│   └── news.js           # Vercel serverless function (Anthropic proxy)
├── src/
│   ├── App.jsx           # Main React component
│   └── main.jsx          # React entry
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
└── README.md
```

## Future ideas

- **Slack integration:** add a cron job that posts the briefing to Slack every morning at 9am.
- **Auth:** wrap with Vercel Password Protection (Pro plan) or add a simple shared-secret header check in `api/news.js`.
- **Bookmarking:** let users save stories to read later (would need a small DB like Vercel KV or Postgres).
