import { PrismaClient } from "@/lib/generated/prisma";
import { limitTransformations } from "@/lib/limits";
import { upstashWorkflow } from "@/lib/apiClients";

interface DoTransformationParams {
  whisperId: string;
  typeName: string;
  userId: string;
  apiKey?: string;
  prisma: PrismaClient;
}

export async function doTransformation({
  whisperId,
  typeName,
  userId,
  apiKey,
  prisma,
}: DoTransformationParams) {
  // 1. Enforce transformation rate limit
  await limitTransformations({
    clerkUserId: userId,
    isBringingKey: !!apiKey,
  });

  // 2. Create transformation in DB
  const transformation = await prisma.transformation.create({
    data: {
      whisperId,
      typeName,
      text: "",
      isGenerating: true,
    },
  });

  // 3. Trigger workflow
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";
  const workflowUrl = `${baseUrl}/api/transform`;
  await upstashWorkflow.trigger({
    url: workflowUrl,
    body: JSON.stringify({
      whisperId,
      transformationId: transformation.id,
      typeName,
      apiKey,
    }),
    retries: 3,
  });

  // 4. Return the created transformation
  return transformation;
}
