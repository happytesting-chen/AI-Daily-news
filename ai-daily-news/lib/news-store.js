import { createClient } from "redis";

const SNAPSHOT_KEY = "ai-daily-news:snapshot";

function getRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }
  return createClient({ url });
}

export async function readSnapshot() {
  const redis = getRedisClient();
  try {
    await redis.connect();
    const raw = await redis.get(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } finally {
    await redis.quit().catch(() => {});
  }
}

export async function writeSnapshot(snapshot) {
  const redis = getRedisClient();
  try {
    await redis.connect();
    await redis.set(SNAPSHOT_KEY, JSON.stringify(snapshot));
    return SNAPSHOT_KEY;
  } finally {
    await redis.quit().catch(() => {});
  }
}

export function getSnapshotPath() {
  return SNAPSHOT_KEY;
}
