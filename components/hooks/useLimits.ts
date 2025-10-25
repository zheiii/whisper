import { useTRPC } from "@/trpc/client";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useApiKeys } from "../ApiKeysProvider";

export const useLimits = () => {
  const { user } = useUser();
  const { openrouterKey, whisperKey } = useApiKeys();

  const hasOpenRouterKey = !!openrouterKey;
  const hasWhisperKey = !!whisperKey;

  const trpc = useTRPC();
  const { data: transformationsData, isLoading: isTransformationsLoading } =
    useQuery({
      ...trpc.limit.getTransformationsLeft.queryOptions(),
      enabled: !!user && !hasOpenRouterKey, // Don't fetch if using OpenRouter BYOK (unlimited)
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
