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
const MINUTES_LIMIT_DEFAULT = 120;
const TRANSFORM_LIMIT_DEFAULT = 10;
const WINDOW = "1440 m"; // 1 day

// Minutes per day limiters
const minutesLimiter =
  !isLocal && redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.fixedWindow(MINUTES_LIMIT_DEFAULT, WINDOW),
        analytics: true,
        prefix: "minutes-limiter",
      })
    : undefined;

// Transformations per day limiters
const transformLimiter =
  !isLocal && redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.fixedWindow(TRANSFORM_LIMIT_DEFAULT, WINDOW),
        analytics: true,
        prefix: "transform-limiter",
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
  remaining: Infinity,
  limit: Infinity,
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
  remaining: Infinity,
  limit: Infinity,
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

  if (isBringingKey) {
    return fallbackMinutesByok;
  }
  if (isTogetherUser(email)) {
    return fallbackMinutes;
  }
  if (!clerkUserId || !minutesLimiter) {
    return fallbackMinutes;
  }

  return await minutesLimiter.limit(clerkUserId, {
    rate: minutes,
  });
}

export async function getMinutes({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) {
  const email = await getUserEmail(clerkUserId);
  if (isBringingKey) {
    return fallbackMinutesByok;
  }
  if (isTogetherUser(email)) {
    return fallbackMinutes;
  }
  if (!clerkUserId || !minutesLimiter) {
    return fallbackMinutes;
  }
  return minutesLimiter.getRemaining(clerkUserId);
}

export async function limitTransformations({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) {
  const email = await getUserEmail(clerkUserId);
  if (isBringingKey) {
    return fallbackTransformByok;
  }
  if (isTogetherUser(email)) {
    return fallbackTransform;
  }
  if (!clerkUserId || !transformLimiter) {
    return fallbackTransform;
  }

  return await transformLimiter.limit(clerkUserId);
}

export async function getTransformations({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) {
  const email = await getUserEmail(clerkUserId);
  if (isBringingKey) {
    return fallbackTransformByok;
  }
  if (isTogetherUser(email)) {
    return fallbackTransform;
  }
  if (!clerkUserId || !transformLimiter) {
    return fallbackTransform;
  }

  try {
    const result = await transformLimiter.getRemaining(clerkUserId);
    return result;
  } catch {
    return fallbackTransform;
  }
}
