import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 8;
const localAttempts = new Map<string, { count: number; expiresAt: number }>();
let redisClient: Redis | undefined;

function redis(): Redis | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return undefined;
  redisClient ??= new Redis({ url, token });
  return redisClient;
}

function attemptKey(identifier: string): string {
  const hash = createHash("sha256").update(identifier).digest("hex").slice(0, 24);
  return `deal-radar:admin-login:${hash}`;
}

function consumeLocal(key: string, now: number): boolean {
  const current = localAttempts.get(key);
  if (!current || current.expiresAt <= now) {
    localAttempts.set(key, { count: 1, expiresAt: now + WINDOW_SECONDS * 1_000 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_ATTEMPTS;
}

export async function consumeAdminLoginAttempt(identifier: string): Promise<boolean> {
  const key = attemptKey(identifier);
  const client = redis();
  if (!client) return consumeLocal(key, Date.now());
  try {
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, WINDOW_SECONDS);
    return count <= MAX_ATTEMPTS;
  } catch {
    return consumeLocal(key, Date.now());
  }
}

export async function clearAdminLoginAttempts(identifier: string): Promise<void> {
  const key = attemptKey(identifier);
  localAttempts.delete(key);
  const client = redis();
  if (client) await client.del(key).catch(() => undefined);
}
