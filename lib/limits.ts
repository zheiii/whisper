// import { Ratelimit } from "@upstash/ratelimit";
// import { Redis } from "@upstash/redis";
// import { clerkClient } from "@clerk/nextjs/server";

// Simplified limits without external dependencies
// const redis = undefined;
// const isLocal = process.env.NODE_ENV !== "production";

// Limits
const MINUTES_LIMIT_DEFAULT = 120;
const TRANSFORM_LIMIT_DEFAULT = 10;
// const WINDOW = "1440 m"; // 1 day

// No external limiters - everything uses fallback values
// const minutesLimiter = undefined;
// const transformLimiter = undefined;

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

// Removed external service dependencies
// function isTogetherUser(email?: string) {
//   return email && email.endsWith("@together.ai");
// }

// async function getUserEmail(clerkUserId?: string) {
//   if (!clerkUserId) return undefined;
//   try {
//     const client = await clerkClient();
//     const user = await client.users.getUser(clerkUserId);
//     return user.emailAddresses?.[0]?.emailAddress;
//   } catch {
//     return undefined;
//   }
// }

export async function limitMinutes({
  clerkUserId,
  isBringingKey,
  minutes,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
  minutes: number;
}) {
  // Simplified - no external dependencies
  if (isBringingKey) {
    return fallbackMinutesByok;
  }
  // Always return fallback limits for now
  return fallbackMinutes;
}

export async function getMinutes({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) {
  // Simplified - no external dependencies
  if (isBringingKey) {
    return fallbackMinutesByok;
  }
  // Always return fallback limits for now
  return fallbackMinutes;
}

export async function limitTransformations({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) {
  // Simplified - no external dependencies
  if (isBringingKey) {
    return fallbackTransformByok;
  }
  // Always return fallback limits for now
  return fallbackTransform;
}

export async function getTransformations({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) {
  // Simplified - no external dependencies
  if (isBringingKey) {
    return fallbackTransformByok;
  }
  // Always return fallback limits for now
  return fallbackTransform;
}
