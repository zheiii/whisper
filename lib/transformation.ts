import { PrismaClient } from "@/lib/generated/prisma";
import { limitTransformations } from "@/lib/limits";
import { streamText } from "ai";
import { togetherVercelAiClient } from "./apiClients";
import { RECORDING_TYPES } from "./utils";

interface DoTransformationParams {
  whisperId: string;
  typeName: string;
  userId: string;
  apiKey?: string;
}

export async function doTransformation({
  whisperId,
  typeName,
  userId,
  apiKey,
}: DoTransformationParams) {
  const prisma = new PrismaClient();

  // 1. Enforce transformation rate limit
  await limitTransformations({
    clerkUserId: userId,
    isBringingKey: !!apiKey,
  });

  const whisper = await prisma.whisper.findUnique({
    where: { id: whisperId },
  });

  if (!whisper) {
    throw new Error("Whisper not found");
  }

  // 2. Create transformation in DB
  const transformation = await prisma.transformation.create({
    data: {
      whisperId,
      typeName,
      text: "",
      isGenerating: true,
    },
  });

  // Start streaming AI generation and save result to DB at the end
  const aiClient = togetherVercelAiClient(apiKey);
  const typeFullName =
    RECORDING_TYPES.find((t) => t.value === typeName)?.name || typeName;
  const prompt = `
  You are a helpful assistant. You will be given a transcription of an audio recording and you will generate a ${typeFullName} based on the transcription with markdown formatting. 
  Only output the generation itself, with no introductions, explanations, or extra commentary.
  
  The transcription is: ${whisper.fullTranscription}

  Return ${typeName === "blog" ? "Markdown" : "plain text"} and nothing else.

  If type is email also generate an email subject line and a short email body with introductory paragraph and a closing paragraph for thanking  the reader for reading.

  Also return the transformation using the language used within the input transcription.

  Do not add phrases like "Based on the transcription" or "Let me know if you'd like me to help with anything else."
`;

  let fullText = "";
  const result = streamText({
    model: aiClient("meta-llama/Meta-Llama-3-70B-Instruct-Turbo"),
    prompt,
  });
  for await (const chunk of result.textStream) {
    fullText += chunk;
    // Optionally, you could emit progress here if you want to support streaming to the client
  }
  await prisma.transformation.update({
    where: { id: transformation.id },
    data: {
      text: fullText,
      isGenerating: false,
    },
  });

  return {
    id: transformation.id,
    isGenerating: false,
    typeName: transformation.typeName,
    text: fullText,
    createdAt: transformation.createdAt,
  };
}
