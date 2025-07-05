import { t } from "../init";
import { z } from "zod";
import { PrismaClient } from "../../lib/generated/prisma";
import { fal } from "@fal-ai/client";
import { v4 as uuidv4 } from "uuid";
import { protectedProcedure } from "../init";

const prisma = new PrismaClient();

export const whisperRouter = t.router({
  listWhispers: protectedProcedure.query(async ({ ctx }) => {
    const whispers = await prisma.whisper.findMany({
      where: { userId: ctx.auth.userId },
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
  createWhisper: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        preview: z.string(),
        timestamp: z.string(),
        duration: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const whisper = await prisma.whisper.create({
        data: {
          userId: ctx.auth.userId,
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
  transcribeFromS3: protectedProcedure
    .input(z.object({ audioUrl: z.string(), whisperId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      // 1. Call Fal Whisper
      fal.config({ credentials: process.env.FAL_KEY! });
      const result = await fal.subscribe("fal-ai/whisper", {
        input: { audio_url: input.audioUrl },
      });
      const transcription = result.data.text as string;
      // Generate a title from the transcription (first 8 words or fallback)
      const title = transcription
        ? transcription.split(" ").slice(0, 8).join(" ") +
          (transcription.split(" ").length > 8 ? "..." : "")
        : "Untitled Whisper";

      if (input.whisperId) {
        // Add AudioTrack to existing Whisper
        const whisper = await prisma.whisper.findUnique({
          where: { id: input.whisperId },
        });
        if (!whisper) throw new Error("Whisper not found");
        // Create new AudioTrack
        await prisma.audioTrack.create({
          data: {
            fileUrl: input.audioUrl,
            partialTranscription: transcription,
            whisperId: input.whisperId,
          },
        });
        // Append to fullTranscription
        await prisma.whisper.update({
          where: { id: input.whisperId },
          data: {
            fullTranscription: whisper.fullTranscription + "\n" + transcription,
          },
        });
        return { id: input.whisperId };
      } else {
        // Create new Whisper and first AudioTrack
        const newId = uuidv4();
        await prisma.whisper.create({
          data: {
            id: newId,
            title,
            userId: ctx.auth.userId,
            fullTranscription: transcription,
            audioTracks: {
              create: [
                {
                  fileUrl: input.audioUrl,
                  partialTranscription: transcription,
                },
              ],
            },
          },
        });
        return { id: newId };
      }
    }),
  getWhisperWithTracks: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const whisper = await prisma.whisper.findUnique({
        where: { id: input.id },
        include: { audioTracks: { orderBy: { createdAt: "asc" } } },
      });
      if (!whisper) throw new Error("Whisper not found");
      return whisper;
    }),
});
