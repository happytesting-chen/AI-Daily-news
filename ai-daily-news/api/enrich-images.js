import { enrichStoriesWithImages } from "../lib/news-core.js";
import { readSnapshot, writeSnapshot } from "../lib/news-store.js";

function getAuthState(req) {
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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authState = getAuthState(req);

  if (req.headers["x-debug-auth"] === "1") {
    return res.status(200).json({ ok: false, debug: authState });
  }

  if (!authState.authorized) {
    return res.status(401).json({ error: "Unauthorized", debug: authState });
  }

  try {
    const snapshot = await readSnapshot();
    if (!snapshot?.stories?.length) {
      return res.status(404).json({ error: "No snapshot available to enrich" });
    }

    const enrichedStories = await enrichStoriesWithImages(snapshot.stories, 20000);
    const nextSnapshot = { ...snapshot, stories: enrichedStories };
    await writeSnapshot(nextSnapshot);

    return res.status(200).json({
      ok: true,
      generatedAt: nextSnapshot.generatedAt,
      stories: nextSnapshot.stories.length,
      withImages: nextSnapshot.stories.filter((story) => Boolean(story.image_url)).length,
    });
  } catch (err) {
    return res.status(500).json({ error: "Image enrichment failed", detail: err.message });
  }
}
