import { useTRPC } from "@/trpc/client";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useOpenAIApiKey } from "../OpenAIApiKeyProvider";

export const useLimits = () => {
  const { user } = useUser();
  const { apiKey } = useOpenAIApiKey();

  const isBYOK = !!apiKey;

  const trpc = useTRPC();
  const { data: transformationsData, isLoading: isTransformationsLoading } =
    useQuery({
      ...trpc.limit.getTransformationsLeft.queryOptions(),
      enabled: !!user && !isBYOK, // Don't fetch if BYOK (unlimited)
    });

  const { data: minutesData, isLoading: isMinutesLoading } = useQuery(
    trpc.limit.getMinutesLeft.queryOptions()
  );

  return {
    transformationsData,
    isLoading: isTransformationsLoading || isMinutesLoading,
    minutesData,
  };
};
