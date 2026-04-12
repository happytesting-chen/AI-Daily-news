const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const ALLOWED_VOICES = new Set(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);
const MAX_TEXT_LENGTH = 500; // characters — prevents abuse / runaway costs

function getAllowedOrigin(req) {
  const host = req.headers.host || "";
  return host.startsWith("localhost") ? `http://${host}` : `https://${host}`;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin = getAllowedOrigin(req);
  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(501).json({ error: "OPENAI_API_KEY not configured" });

  const { text, voice } = req.body || {};

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "text is required" });
  }
  if (!ALLOWED_VOICES.has(voice)) {
    return res.status(400).json({ error: `voice must be one of: ${[...ALLOWED_VOICES].join(", ")}` });
  }

  const safeText = text.trim().slice(0, MAX_TEXT_LENGTH);

  const response = await fetch(OPENAI_TTS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",   // higher quality model
      voice,
      input: safeText,
      speed: 1.0,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    console.error(`OpenAI TTS error ${response.status}`);
    return res.status(502).json({ error: "TTS generation failed" });
  }

  // Stream the audio directly back to the browser
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "private, max-age=3600"); // cache per-line audio for 1h
  const buffer = await response.arrayBuffer();
  res.send(Buffer.from(buffer));
}
