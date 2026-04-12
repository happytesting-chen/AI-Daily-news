// Local dev server for /api/news — replaces Vercel serverless function
import http from "http";
import { readFileSync } from "fs";

// Load .env manually
try {
  const env = readFileSync(".env", "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
} catch {}

const AI_NEWS_PROMPT = `You are an AI news aggregator. Search the web for TODAY's most important AI news stories.

Prioritize these sources (in order): arXiv new AI papers, Anthropic blog, OpenAI blog, MIT Technology Review, Wired, TechCrunch, VentureBeat, The Verge, Ars Technica.

Return ONLY a valid JSON array (no markdown, no backticks, no preamble) of 5-7 stories. Each story object must have:
- "title": string (headline)
- "summary": string (2-3 sentence summary)
- "source": string (publication name)
- "url": string (article URL)
- "category": string (one of: "Research", "Product", "Industry", "Policy", "Open Source")
- "time_ago": string (e.g. "2h ago", "5h ago", "today")

Sort by importance/recency. Only include stories from the last 24 hours.`;

const SECURITY_NEWS_PROMPT = `You are an AI cybersecurity news aggregator. Search the web for TODAY's most important AI-related cybersecurity news, vulnerabilities, and advisories.

Prioritize these sources: NVD/CVE database (include CVSS scores), CISA advisories, The Hacker News (thehackernews.com), Krebs on Security, Bleeping Computer, Anthropic red team blog.

Return ONLY a valid JSON array (no markdown, no backticks, no preamble) of 4-6 stories. Each story object must have:
- "title": string (headline)
- "summary": string (2-3 sentence summary including specific CVE IDs if applicable)
- "source": string (publication name)
- "url": string (article URL)
- "severity": string (one of: "critical", "high", "medium", "low" — based on CVSS score if available)
- "cvss_score": number or null
- "time_ago": string (e.g. "2h ago", "today")

Sort by severity (critical first), then recency.`;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
  if (req.url !== "/api/news" || req.method !== "POST") {
    res.writeHead(404); res.end("Not found"); return;
  }

  let body = "";
  req.on("data", d => body += d);
  req.on("end", async () => {
    const { type } = JSON.parse(body || "{}");
    const prompt = type === "security" ? SECURITY_NEWS_PROMPT : AI_NEWS_PROMPT;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }));
      return;
    }

    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 4000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await upstream.json();
      const fullText = (data.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n");
      const cleaned = fullText.replace(/```json|```/g, "").trim();

      let stories = [];
      try { stories = JSON.parse(cleaned); }
      catch { const m = cleaned.match(/\[[\s\S]*\]/); if (m) stories = JSON.parse(m[0]); }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ stories }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(3001, () => console.log("API server running on http://localhost:3001"));
