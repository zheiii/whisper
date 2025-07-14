import { serve } from "@upstash/workflow/nextjs";
import { PrismaClient } from "@/lib/generated/prisma";
import { togetheraiClientWithKey } from "@/lib/apiClients";
import { generateText } from "ai";

// Define the expected POST body type
export interface TransformWorkflowPayload {
  whisperId: string;
  transformationId: string;
  typeName: string;
  apiKey?: string;
}

export const { POST } = serve<TransformWorkflowPayload>(async (context) => {
  const body =
    typeof context.requestPayload === "string"
      ? JSON.parse(context.requestPayload)
      : context.requestPayload;
  const { whisperId, transformationId, typeName, apiKey } = body;

  const prisma = new PrismaClient();

  let whisper: { fullTranscription: string } | null;
  // Step 1: Fetch DB data
  await context.run("fetch-whisper", async () => {
    whisper = await prisma.whisper.findUnique({
      where: { id: whisperId },
    });
    if (!whisper) throw new Error("Whisper not found");
  });

  let aiText = "";
  // Step 2: Process with AI
  await context.run("process-with-ai", async () => {
    const aiClient = togetheraiClientWithKey(apiKey);
    const prompt = `
      You are a helpful assistant. You will be given a transcription of an audio recording and you will generate a ${typeName} based on the transcription.
      The transcription is: ${whisper!.fullTranscription}
    `;

    const { text } = await generateText({
      model: aiClient("meta-llama/Meta-Llama-3-70B-Instruct-Turbo"),
      prompt,
    });
    aiText = text;
  });

  // Step 3: Store results back in DB
  await context.run("store-transformation", async () => {
    await prisma.transformation.update({
      where: { id: transformationId },
      data: {
        text: aiText,
        isGenerating: false,
      },
    });
  });

  await prisma.$disconnect();
});
