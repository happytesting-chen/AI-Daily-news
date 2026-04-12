const CATEGORY_DEFINITIONS = [
  {
    name: "AI System Security",
    description:
      "Security weaknesses, vulnerabilities, testing methods, red teaming, jailbreaks, prompt injection, model misuse risks, AI application security, and defenses for AI or LLM systems themselves.",
    sources:
      "NVD/CVE (AI tags), arXiv cs.CR, HiddenLayer, Protect AI, Anthropic red team, OWASP LLM Top 10",
  },
  {
    name: "AI for Defense",
    description:
      "AI used to improve cyber defense, detection, triage, threat hunting, SOC workflows, malware analysis, vulnerability management, or security operations by defenders and security vendors.",
    sources:
      "Dark Reading, SC Media, CrowdStrike, SentinelOne, Palo Alto, Google Project Zero, MITRE",
  },
  {
    name: "AI-Powered Attacks",
    description:
      "Real-world attacker use of AI, malicious automation, AI-assisted phishing or malware, threat actor campaigns, abuse reports, incident reports, and urgent advisories involving AI-enabled offensive activity.",
    sources:
      "Microsoft Threat Intel, Google TAG, Mandiant, Recorded Future, Krebs, The Hacker News, CISA advisories",
  },
  {
    name: "AI New Releases",
    description:
      "New AI model launches, agent framework releases, and notable open-source AI projects. Covers announcements from OpenAI, Anthropic, Google DeepMind, Meta AI, Mistral, and others, plus trending repositories on GitHub and HuggingFace — especially new agent frameworks, coding assistants, and breakthrough open-source models.",
    sources:
      "OpenAI blog, Anthropic blog, Google DeepMind blog, HuggingFace blog, GitHub Trending, papers with code, AI Twitter/X announcements",
  },
];

const CATEGORY_BLOCK = CATEGORY_DEFINITIONS.map(
  (category) => `- ${category.name}: ${category.description} Example sources: ${category.sources}.`
).join("\n");

const AI_NEWS_PROMPT = `You are an AI news aggregator. Search the web for today's most important AI and AI-security stories.

Classify each story into exactly one category using these definitions:
${CATEGORY_BLOCK}

Return ONLY a valid JSON array of 6-8 stories, no markdown. Each story object must have:
- "title": string
- "tldr": string (1 short sentence)
- "why_it_matters": string (1 short sentence)
- "source": string
- "url": string — MUST be the full URL to the specific article (e.g. https://thehackernews.com/2026/04/article-slug.html), NOT a homepage or domain root. If you cannot find the exact article URL, use "".
- "category": string (exactly one of: "AI System Security", "AI for Defense", "AI-Powered Attacks", "AI New Releases")
- "impact": string ("high", "medium", or "low")
- "time_ago": string

Rules:
- Return 8-10 stories total: at least 1-2 per category, including at least 2 for "AI New Releases".
- For "AI New Releases": search GitHub Trending and HuggingFace trending — include newly released agent frameworks, open-source models, and major lab announcements even if < 7 days old.
- Last 24 hours for security categories; last 7 days allowed for "AI New Releases".
- Classify by article meaning, not only source.
- Prefer source diversity.
- Double-check every url — it must contain a path beyond "/" (e.g. /2026/04/slug). Never use a bare domain as the url.`;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-5";

function extractStoriesFromText(text) {
  const cleaned = (text || "").replace(/```json|```/g, "").trim();
  if (!cleaned) return [];

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  }

  return [];
}

// Reject homepage-only URLs like "https://thehackernews.com/" or "https://example.com"
function isArticleUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const { pathname } = new URL(rawUrl);
    // Must have a path with at least one non-slash segment of length > 1
    const meaningful = pathname.replace(/^\/+|\/+$/g, ""); // strip leading/trailing slashes
    return meaningful.length > 1;
  } catch {
    return false;
  }
}

function normalizeCategory(category) {
  const allowed = new Set(CATEGORY_DEFINITIONS.map((item) => item.name));
  if (allowed.has(category)) return category;
  return "AI System Security";
}

async function fetchAnthropicStories(apiKey) {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2800,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: AI_NEWS_PROMPT }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const fullText = (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return extractStoriesFromText(fullText).map((story) => ({
    ...story,
    category: normalizeCategory(story.category),
    // Blank out homepage-only URLs so the UI doesn't show a misleading "Read more" link
    url: isArticleUrl(story.url) ? story.url : "",
  }));
}

// SSRF guard: only allow public HTTPS URLs, reject private/internal ranges
function isSafeUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return false; }

  // Must be HTTPS
  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();

  // Block localhost and loopback
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;

  // Block private IPv4 ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
  const privateV4 = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/;
  if (privateV4.test(host)) return false;

  // Block raw IPv4/IPv6 addresses (cloud metadata endpoints etc.)
  const ipv4Pattern = /^\d{1,3}(\.\d{1,3}){3}$/;
  if (ipv4Pattern.test(host)) return false;

  // Block .local and .internal hostnames
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;

  return true;
}

async function fetchOgImage(url) {
  if (!isSafeUrl(url)) return "";

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    const html = await res.text();

    // og:image (attribute order varies)
    const og =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (og?.[1]) return og[1];

    // twitter:image fallback
    const tw =
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (tw?.[1]) return tw[1];

    return "";
  } catch {
    return "";
  }
}

export function dedupeStories(stories) {
  const seen = new Set();
  return stories.filter((story) => {
    const key = (story?.title || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function buildNewsSnapshot(apiKey) {
  const stories = await fetchAnthropicStories(apiKey);
  const deduped = dedupeStories(stories || []);

  // Return stories immediately without images — caller can enrich separately
  return {
    generatedAt: new Date().toISOString(),
    stories: deduped.map((s) => ({ ...s, image_url: "" })),
    categories: CATEGORY_DEFINITIONS,
  };
}

// Fetch OG images for all stories with a strict total time budget.
// Safe to call after the snapshot is already saved — enriches in place.
export async function enrichStoriesWithImages(stories, budgetMs = 10000) {
  const deadline = Date.now() + budgetMs;

  const enriched = await Promise.all(
    stories.map(async (story) => {
      if (!story.url || Date.now() > deadline) return story;
      const raw = await fetchOgImage(story.url);
      const image_url = isSafeUrl(raw) ? raw : "";
      return { ...story, image_url };
    })
  );

  return enriched;
}
