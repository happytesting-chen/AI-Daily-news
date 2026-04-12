import { buildNewsSnapshot } from "../lib/news-core.js";
import { writeSnapshot } from "../lib/news-store.js";

function getRefreshAuthState(req) {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const vercelCronHeader = req.headers["x-vercel-cron"];
  const authorized = (cronSecret && bearer === cronSecret) || vercelCronHeader === "1";

  return {
    authorized,
    hasCronSecret: Boolean(cronSecret),
    authHeaderPresent: Boolean(authHeader),
    bearerLength: bearer.length,
    cronSecretLength: cronSecret.length,
    vercelCronHeader: vercelCronHeader || null,
  };
}

async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return { skipped: true, reason: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing" };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Telegram send failed (${response.status}): ${detail}`);
  }

  return { skipped: false };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authState = getRefreshAuthState(req);

  if (req.headers["x-debug-auth"] === "1") {
    return res.status(200).json({
      ok: false,
      debug: authState,
    });
  }

  if (!authState.authorized) {
    return res.status(401).json({ error: "Unauthorized", debug: authState });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const snapshot = await buildNewsSnapshot(apiKey);
    await writeSnapshot(snapshot);

    const path = snapshot.generatedAt;

    const generatedLocal = new Date(snapshot.generatedAt).toLocaleString("en-SG", {
      timeZone: "Asia/Singapore",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const telegramResult = await sendTelegramMessage(
      `AI Daily is ready.\n\nUpdated: ${generatedLocal} (Singapore)\nhttps://ai-daily-news-delta.vercel.app`
    );

    return res.status(200).json({
      ok: true,
      generatedAt: snapshot.generatedAt,
      path,
      counts: {
        stories: snapshot.stories?.length || 0,
        byCategory: (snapshot.stories || []).reduce((acc, story) => {
          const key = story.category || "Uncategorized";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      },
      telegram: telegramResult,
    });
  } catch (err) {
    return res.status(500).json({ error: "Refresh failed", detail: err.message });
  }
}
