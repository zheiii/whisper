import { initTRPC } from "@trpc/server";
import { inferAsyncReturnType } from "@trpc/server";
import { type NextRequest } from "next/server";

// You can extend this context as needed
export async function createTRPCContext(opts?: { req?: NextRequest }) {
  return {};
}

export const t = initTRPC.context<typeof createTRPCContext>().create();

export type TRPCContext = inferAsyncReturnType<typeof createTRPCContext>;
