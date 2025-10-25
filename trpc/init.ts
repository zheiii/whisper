import { initTRPC, TRPCError } from "@trpc/server";
import { inferAsyncReturnType } from "@trpc/server";
import { type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

// You can extend this context as needed
export async function createTRPCContext(opts?: { req?: NextRequest }) {
  // Get Clerk auth object
  const clerkAuth = await auth();
  let whisperApiKey: string | undefined = undefined;
  let openRouterApiKey: string | undefined = undefined;
  if (opts?.req) {
    whisperApiKey = opts.req.headers.get("WhisperAPIToken") || undefined;
    openRouterApiKey = opts.req.headers.get("OpenRouterAPIToken") || undefined;
  }
  return { auth: clerkAuth, whisperApiKey, openRouterApiKey };
}

export const t = initTRPC.context<typeof createTRPCContext>().create();

export type TRPCContext = inferAsyncReturnType<typeof createTRPCContext>;

// Middleware to ensure user is authenticated
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.auth?.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      auth: ctx.auth,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
