# INCIDENTS.md

Short record of notable incidents and fixes for **AI Daily News**.
Keep entries brief and operational.

---

## 2026-04-12, Vercel cron timeout blocked Telegram notification

### Symptoms
- Daily news Telegram message did not arrive
- Manual refresh returned `FUNCTION_INVOCATION_TIMEOUT`

### Cause
- The refresh path performed both:
  - news generation
  - image enrichment
- Combined work exceeded the Vercel function time budget on a slow run

### Fix
- Split the flow into separate scheduled endpoints:
  - `/api/refresh?sendTelegram=0`
  - `/api/send-telegram`
  - `/api/enrich-images`
- Pre-generate content before 08:00
- Send the Telegram message at 08:00 sharp
- Move OG image enrichment into a separate follow-up cron

### Follow-up
- Monitor whether pre-generation completes reliably by 08:00 Singapore time
- If timeouts continue, reduce story count or simplify the generation workload
- Enforce stricter freshness handling so non-release categories are date-checked before summarization

---

## 2026-04-12, local secret exposure discovered in original project directory

### Symptoms
- Real credentials were found in local `.env` files outside the workspace repo

### Impact
- Workspace repo remained clean
- Original local project directory contained sensitive values

### Response
- Excluded secret files when copying the project into the workspace repo
- Added `.gitignore` protections in the workspace repo
- Recommended secret rotation for exposed local credentials
