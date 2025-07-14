import { serve } from "@upstash/workflow/nextjs";
import { PrismaClient } from "@/lib/generated/prisma";
import { togetheraiClientWithKey } from "@/lib/apiClients";
import { generateText } from "ai";
import { RECORDING_TYPES } from "@/lib/utils";

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

  const whisper = await context.run("fetch-whisper", async () => {
    const data = await prisma.whisper.findUnique({
      where: { id: whisperId },
    });
    if (!data) throw new Error("Whisper not found");

    return data;
  });

  const aiText = await context.run("process-with-ai", async () => {
    const aiClient = togetheraiClientWithKey(apiKey);

    const typeFullName = RECORDING_TYPES.find((t) => t.name === typeName)?.name;

    const prompt = `
      You are a helpful assistant. You will be given a transcription of an audio recording and you will generate a ${typeFullName} based on the transcription with markdown formatting. 
      Only output the generation itself, with no introductions, explanations, or extra commentary.
      
      The transcription is: ${whisper.fullTranscription}

      Do not add phrases like "Based on the transcription" or "Let me know if you'd like me to help with anything else."
    `;

    const { text } = await generateText({
      model: aiClient("meta-llama/Meta-Llama-3-70B-Instruct-Turbo"),
      prompt,
    });

    return text;
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
