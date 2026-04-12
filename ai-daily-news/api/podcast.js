const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

// Derive allowed origin from the request host so it works on any Vercel deployment URL
// (production, preview, localhost) while still blocking third-party cross-origin requests
function getAllowedOrigin(req) {
  const host = req.headers.host || "";
  return host.startsWith("localhost") ? `http://${host}` : `https://${host}`;
}

// Field length limits — prevents token-stuffing / prompt injection via large payloads
const FIELD_LIMITS = {
  title: 200,
  tldr: 400,
  why_it_matters: 400,
  category: 60,
  source: 100,
};

const SYSTEM_PROMPT = `You write natural two-person podcast dialogue. Your goal is to sound exactly like two real people genuinely talking — not a scripted interview, not a lecture.

The two hosts are Alex (speaker1, curious, slightly more casual) and Jordan (speaker2, knowledgeable but warm). They already know each other well.

What makes this feel human:
- Natural reactions mid-conversation: "Huh.", "Wait — seriously?", "Right, right.", "Oh that's wild.", "Yeah, exactly."
- Occasional light verbal fillers that feel natural when spoken: "I mean", "you know", "like"
- Short punchy lines mixed with longer explanations — not every line the same length
- Alex reacts to what Jordan says before asking the next thing — they actually listen to each other
- Jordan sometimes says things like "What got me is..." or "The part that actually surprised me was..."
- Genuine back-and-forth — no one monologues for more than 2–3 sentences
- End naturally — don't force a big conclusion, just wind down like a real conversation

Format — use ONLY these tags, one per line, nothing else:
<speaker1>Alex's line.
<speaker2>Jordan's line.

Rules:
- 8–12 turns total
- Under 220 words
- Only use facts from the story — never invent details
- Do NOT write stage directions, headers, or any text outside the tags
- Do NOT use "Absolutely!", "Great question!", "Certainly!" — these sound robotic`;

function sanitiseField(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function buildSafeStory(body) {
  return {
    title: sanitiseField(body.title, FIELD_LIMITS.title),
    tldr: sanitiseField(body.tldr, FIELD_LIMITS.tldr),
    why_it_matters: sanitiseField(body.why_it_matters, FIELD_LIMITS.why_it_matters),
    category: sanitiseField(body.category, FIELD_LIMITS.category),
    source: sanitiseField(body.source, FIELD_LIMITS.source),
  };
}

async function generateDialogue(apiKey, story) {
  const storyText = [
    `Title: ${story.title}`,
    story.tldr ? `Summary: ${story.tldr}` : "",
    story.why_it_matters ? `Why it matters: ${story.why_it_matters}` : "",
    `Category: ${story.category}`,
    `Source: ${story.source}`,
  ].filter(Boolean).join("\n");

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Here is the story:\n\n${storyText}\n\nGenerate the dialogue now.` }],
    }),
  });

  if (!response.ok) {
    // Do NOT forward raw API error body to the client — it may contain sensitive info
    const status = response.status;
    console.error(`Anthropic API error ${status}`);
    throw new Error(`Upstream API error (${status})`);
  }

  const data = await response.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

export default async function handler(req, res) {
  // CORS — only allow requests from the same deployment (blocks third-party callers)
  const origin = req.headers.origin;
  const allowedOrigin = getAllowedOrigin(req);
  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server misconfiguration" });

  // Validate and sanitise input
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const story = buildSafeStory(body);
  if (!story.title) {
    return res.status(400).json({ error: "Story title is required" });
  }

  try {
    const dialogue = await generateDialogue(apiKey, story);
    return res.status(200).json({ title: story.title, dialogue });
  } catch (err) {
    // Return a generic message — never expose internal error details
    console.error("Podcast generation error:", err.message);
    return res.status(502).json({ error: "Failed to generate dialogue. Please try again." });
  }
}
