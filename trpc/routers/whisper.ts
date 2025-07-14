import { t } from "../init";
import { z } from "zod";
import { PrismaClient } from "../../lib/generated/prisma";
import { fal } from "@fal-ai/client";
import { v4 as uuidv4 } from "uuid";
import { protectedProcedure } from "../init";
import { limitMinutes, limitTransformations } from "@/lib/limits";
import { togetheraiClientWithKey, upstashWorkflow } from "@/lib/apiClients";
import { doTransformation } from "@/lib/transformation";
import { generateText } from "ai";
import { TransformWorkflowPayload } from "@/app/api/transform/route";

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
      preview:
        w.fullTranscription.length > 80
          ? w.fullTranscription.slice(0, 80) + "..."
          : w.fullTranscription,
      timestamp: w.createdAt.toISOString(),
      // duration: ... // If you want to add duration, you can extend the model or calculate from audioTracks
    }));
  }),
  transcribeFromS3: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string(),
        whisperId: z.string().optional(),
        language: z.string().optional(),
        noteType: z.string().optional(),
        durationSeconds: z.number().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Enforce minutes limit
      const minutes = Math.ceil(input.durationSeconds / 60);

      console.log("decreasing of minutes", minutes);

      const limitResult = await limitMinutes({
        clerkUserId: ctx.auth.userId,
        isBringingKey: !!ctx.togetherApiKey,
        minutes,
      });

      if (!limitResult.success) {
        throw new Error("You have exceeded your daily audio minutes limit.");
      }
      // 1. Call Fal Whisper
      fal.config({ credentials: process.env.FAL_KEY! });
      const result = await fal.subscribe("fal-ai/whisper", {
        input: {
          audio_url: input.audioUrl,
          language: (input.language as any) || undefined,
        },
      });
      const transcription = result.data.text as string;
      // Generate a title from the transcription (first 8 words or fallback)
      const title = transcription
        ? transcription.split(" ").slice(0, 8).join(" ") +
          (transcription.split(" ").length > 8 ? "..." : "")
        : "Untitled Whisper";

      const whisperId = input.whisperId || uuidv4();

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
            language: input.language,
          },
        });
        // Append to fullTranscription
        await prisma.whisper.update({
          where: { id: input.whisperId },
          data: {
            fullTranscription: whisper.fullTranscription + "\n" + transcription,
          },
        });
      } else {
        // Create new Whisper and first AudioTrack
        await prisma.whisper.create({
          data: {
            id: whisperId,
            title,
            userId: ctx.auth.userId,
            fullTranscription: transcription,
            audioTracks: {
              create: [
                {
                  fileUrl: input.audioUrl,
                  partialTranscription: transcription,
                  language: input.language,
                },
              ],
            },
          },
        });
      }

      // If noteType is present, create a transformation and trigger workflow
      if (input.noteType) {
        await doTransformation({
          whisperId,
          typeName: input.noteType,
          userId: ctx.auth.userId,
          apiKey: ctx.togetherApiKey,
          prisma,
        });
      }
      return { id: whisperId };
    }),
  getWhisperWithTracks: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const whisper = await prisma.whisper.findUnique({
        where: { id: input.id },
        include: {
          transformations: { orderBy: { createdAt: "asc" } },
        },
      });
      if (!whisper) throw new Error("Whisper not found");
      return whisper;
    }),
  updateFullTranscription: protectedProcedure
    .input(z.object({ id: z.string(), fullTranscription: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Only allow the owner to update
      const whisper = await prisma.whisper.findUnique({
        where: { id: input.id },
      });
      if (!whisper) throw new Error("Whisper not found");
      if (whisper.userId !== ctx.auth.userId) throw new Error("Unauthorized");
      const updated = await prisma.whisper.update({
        where: { id: input.id },
        data: { fullTranscription: input.fullTranscription },
      });
      return { id: updated.id, fullTranscription: updated.fullTranscription };
    }),
  updateTitle: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Only allow the owner to update
      const whisper = await prisma.whisper.findUnique({
        where: { id: input.id },
      });
      if (!whisper) throw new Error("Whisper not found");
      if (whisper.userId !== ctx.auth.userId) throw new Error("Unauthorized");
      const updated = await prisma.whisper.update({
        where: { id: input.id },
        data: { title: input.title },
      });
      return { id: updated.id, title: updated.title };
    }),
  deleteWhisper: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Only allow the owner to delete
      const whisper = await prisma.whisper.findUnique({
        where: { id: input.id },
      });
      if (!whisper) throw new Error("Whisper not found");
      if (whisper.userId !== ctx.auth.userId) throw new Error("Unauthorized");

      // Delete all related Transformations first
      await prisma.transformation.deleteMany({
        where: { whisperId: input.id },
      });

      // Delete all related AudioTracks
      await prisma.audioTrack.deleteMany({
        where: { whisperId: input.id },
      });

      // Now delete the Whisper
      await prisma.whisper.delete({
        where: { id: input.id },
      });
      return { id: input.id };
    }),

  // --- CREATE TRANSFORMATION ---
  createTransformation: protectedProcedure
    .input(z.object({ id: z.string(), typeName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Only allow the owner to create transformation
      const whisper = await prisma.whisper.findUnique({
        where: { id: input.id },
      });
      if (!whisper) throw new Error("Whisper not found");
      if (whisper.userId !== ctx.auth.userId) throw new Error("Unauthorized");

      try {
        const transformation = await doTransformation({
          whisperId: input.id,
          typeName: input.typeName,
          userId: ctx.auth.userId,
          apiKey: ctx.togetherApiKey,
          prisma,
        });
        return {
          id: transformation.id,
          isGenerating: transformation.isGenerating,
          typeName: transformation.typeName,
          text: transformation.text,
          createdAt: transformation.createdAt,
        };
      } catch (e) {
        throw e;
      }
    }),
});
