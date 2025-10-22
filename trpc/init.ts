import { initTRPC, TRPCError } from "@trpc/server";
import { inferAsyncReturnType } from "@trpc/server";
import { type NextRequest } from "next/server";
// import { auth } from "@clerk/nextjs/server";

// You can extend this context as needed
export async function createTRPCContext(opts?: { req?: NextRequest }) {
  // Simulate authenticated user instead of Clerk auth
  const simulatedAuth = {
    userId: "temp-user-id",
    sessionId: "temp-session-id",
  };
  let openaiApiKey: string | undefined = undefined;
  if (opts?.req) {
    openaiApiKey = opts.req.headers.get("OpenAIAPIToken") || undefined;
  }
  return { auth: simulatedAuth, openaiApiKey };
}

export const t = initTRPC.context<typeof createTRPCContext>().create();

export type TRPCContext = inferAsyncReturnType<typeof createTRPCContext>;

// Middleware to ensure user is authenticated (simulated)
const isAuthed = t.middleware(({ next, ctx }) => {
  // For now, always simulate authenticated user
  if (!ctx.auth?.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      auth: ctx.auth,
      openaiApiKey: ctx.openaiApiKey,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
