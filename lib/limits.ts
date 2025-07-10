import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { clerkClient } from "@clerk/nextjs/server";

const redis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

const isLocal = process.env.NODE_ENV !== "production";

// Limits
const MINUTES_LIMIT_DEFAULT = 30;
const MINUTES_LIMIT_BYOK = 90;
const TRANSFORM_LIMIT_DEFAULT = 10;
const TRANSFORM_LIMIT_BYOK = 30;
const WINDOW = "1440 m"; // 1 day
const WINDOW_SECONDS = 60 * 60 * 24; // 1 day in seconds

const BYOK_PREFIX = "byok-";

// Transformations per day limiters
const transformLimiterDefault =
  !isLocal && redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.fixedWindow(TRANSFORM_LIMIT_DEFAULT, WINDOW),
        analytics: true,
      })
    : undefined;

const transformLimiterByok =
  !isLocal && redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.fixedWindow(TRANSFORM_LIMIT_BYOK, WINDOW),
        analytics: true,
      })
    : undefined;

const fallbackMinutes = {
  success: true,
  remaining: MINUTES_LIMIT_DEFAULT,
  limit: MINUTES_LIMIT_DEFAULT,
  reset: null,
};
const fallbackMinutesByok = {
  success: true,
  remaining: MINUTES_LIMIT_BYOK,
  limit: MINUTES_LIMIT_BYOK,
  reset: null,
};
const fallbackTransform = {
  success: true,
  remaining: TRANSFORM_LIMIT_DEFAULT,
  limit: TRANSFORM_LIMIT_DEFAULT,
  reset: null,
};
const fallbackTransformByok = {
  success: true,
  remaining: TRANSFORM_LIMIT_BYOK,
  limit: TRANSFORM_LIMIT_BYOK,
  reset: null,
};

function isTogetherUser(email?: string) {
  return email && email.endsWith("@together.ai");
}

async function getUserEmail(clerkUserId?: string) {
  if (!clerkUserId) return undefined;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    return user.emailAddresses?.[0]?.emailAddress;
  } catch {
    return undefined;
  }
}

function getMinutesKey(clerkUserId: string, isBringingKey?: boolean) {
  const prefix = isBringingKey ? BYOK_PREFIX : "";
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  const d = today.getUTCDate();
  return `minutes:${prefix}${clerkUserId}:${y}-${m}-${d}`;
}

export async function limitMinutes({
  clerkUserId,
  isBringingKey,
  minutes,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
  minutes: number;
}) {
  const email = await getUserEmail(clerkUserId);
  if (isTogetherUser(email)) {
    return isBringingKey ? fallbackMinutesByok : fallbackMinutes;
  }
  if (!clerkUserId || !redis) {
    return isBringingKey ? fallbackMinutesByok : fallbackMinutes;
  }
  const limit = isBringingKey ? MINUTES_LIMIT_BYOK : MINUTES_LIMIT_DEFAULT;
  const key = getMinutesKey(clerkUserId, isBringingKey);
  // Atomically increment and set expiry if new
  const current = await redis.eval(
    [
      "local v = redis.call('INCRBY', KEYS[1], ARGV[1])",
      "if v == tonumber(ARGV[1]) then redis.call('EXPIRE', KEYS[1], ARGV[2]) end",
      "return v",
    ].join("; "),
    [key],
    [minutes, WINDOW_SECONDS]
  );
  const remaining = Math.max(0, limit - Number(current));
  return {
    success: Number(current) <= limit,
    remaining,
    limit,
    reset: null, // Optionally, calculate reset time
  };
}

export async function getMinutes({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) {
  const email = await getUserEmail(clerkUserId);
  if (isTogetherUser(email)) {
    return isBringingKey ? fallbackMinutesByok : fallbackMinutes;
  }
  if (!clerkUserId || !redis) {
    return isBringingKey ? fallbackMinutesByok : fallbackMinutes;
  }
  const limit = isBringingKey ? MINUTES_LIMIT_BYOK : MINUTES_LIMIT_DEFAULT;
  const key = getMinutesKey(clerkUserId, isBringingKey);
  const current = Number((await redis.get(key)) || 0);
  const remaining = Math.max(0, limit - current);
  return {
    success: current < limit,
    remaining,
    limit,
    reset: null, // Optionally, calculate reset time
  };
}

export async function limitTransformations({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) {
  const email = await getUserEmail(clerkUserId);
  if (isTogetherUser(email)) {
    return isBringingKey ? fallbackTransformByok : fallbackTransform;
  }
  if (!clerkUserId) {
    return isBringingKey ? fallbackTransformByok : fallbackTransform;
  }
  const limiter = isBringingKey
    ? transformLimiterByok
    : transformLimiterDefault;
  if (!limiter) {
    return isBringingKey ? fallbackTransformByok : fallbackTransform;
  }
  const key = (isBringingKey ? BYOK_PREFIX : "") + clerkUserId;
  const result = await limiter.limit(key);
  return {
    success: result.success,
    remaining: result.remaining,
    limit: result.limit,
    reset: result.reset,
  };
}

export async function getTransformations({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) {
  const email = await getUserEmail(clerkUserId);
  if (isTogetherUser(email)) {
    return isBringingKey ? fallbackTransformByok : fallbackTransform;
  }
  if (!clerkUserId) {
    return isBringingKey ? fallbackTransformByok : fallbackTransform;
  }
  const limiter = isBringingKey
    ? transformLimiterByok
    : transformLimiterDefault;
  if (!limiter) {
    return isBringingKey ? fallbackTransformByok : fallbackTransform;
  }
  const key = (isBringingKey ? BYOK_PREFIX : "") + clerkUserId;
  try {
    const result = await limiter.getRemaining(key);
    return result;
  } catch {
    return isBringingKey ? fallbackTransformByok : fallbackTransform;
  }
}
