# DEPLOYMENT.md

Deployment notes for **AI Daily News**.

## Hosting

- Target platform: Vercel
- Frontend build: Vite
- Output directory: `dist`

## Scheduled Jobs

Configured in `vercel.json`:

- `/api/refresh?sendTelegram=0` → `40 23 * * *` → 07:40 Asia/Singapore
- `/api/enrich-images` → `50 23 * * *` → 07:50 Asia/Singapore
- `/api/send-telegram` → `0 0 * * *` → 08:00 Asia/Singapore

## Required Environment Variables

Set these in Vercel Project Settings, not in git-tracked files:

- `ANTHROPIC_API_KEY`
- `REDIS_URL`
- `CRON_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional:
- `OPENAI_API_KEY`

## Manual Health Checks

Run manually with bearer auth:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-site.vercel.app/api/refresh
curl -H "Authorization: Bearer $CRON_SECRET" https://your-site.vercel.app/api/enrich-images
```

## Expected Behavior

### `/api/refresh`
- generates fresh stories
- writes snapshot to Redis
- can skip Telegram notification when called with `sendTelegram=0`
- returns quickly

### `/api/send-telegram`
- reads the latest snapshot from Redis
- sends the Telegram message exactly on schedule

### `/api/enrich-images`
- reads existing snapshot from Redis
- fetches OG images for story links
- updates snapshot with image URLs

## Failure Triage

### If cron ran but no Telegram message arrived
Check, in order:
1. Vercel function logs for `/api/refresh`
2. timeout errors
3. Anthropic API errors or quota issues
4. Redis errors
5. Telegram API errors

### If site updates but images are missing
Check:
1. `/api/enrich-images` logs
2. image source sites blocking fetches
3. function timeout during image enrichment

## Security Notes

- Keep all secrets in Vercel env vars
- Treat local `.env` files as untracked only
- Rotate any secret that was ever pasted into a tracked file or public chat
