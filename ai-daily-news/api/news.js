import { readSnapshot } from "../lib/news-store.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const snapshot = await readSnapshot();
  if (!snapshot) {
    return res.status(503).json({
      error: "News snapshot not generated yet",
      detail: "Run the server-side refresh job first.",
    });
  }

  return res.status(200).json(snapshot);
}
