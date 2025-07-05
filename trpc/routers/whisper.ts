import { t } from "../init";
import { z } from "zod";
import { PrismaClient } from "../../lib/generated/prisma";

const prisma = new PrismaClient();

export const whisperRouter = t.router({
  listWhispers: t.procedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const whispers = await prisma.whisper.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: "desc" },
      });
      // Map to dashboard shape
      return whispers.map((w) => ({
        id: w.id,
        title: w.title,
        content: w.fullTranscription,
        preview: w.fullTranscription.slice(0, 80),
        timestamp: w.createdAt.toISOString(),
        // duration: ... // If you want to add duration, you can extend the model or calculate from audioTracks
      }));
    }),
  createWhisper: t.procedure
    .input(
      z.object({
        userId: z.string(),
        title: z.string(),
        content: z.string(),
        preview: z.string(),
        timestamp: z.string(),
        duration: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const whisper = await prisma.whisper.create({
        data: {
          userId: input.userId,
          title: input.title,
          fullTranscription: input.content,
          createdAt: new Date(input.timestamp),
        },
      });
      return {
        id: whisper.id,
        title: whisper.title,
        content: whisper.fullTranscription,
        preview: input.preview,
        timestamp: whisper.createdAt.toISOString(),
        duration: input.duration,
      };
    }),
});
