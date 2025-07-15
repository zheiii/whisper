"use client";

import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatWhisperTimestamp, RECORDING_TYPES } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { TransformDropdown } from "@/components/TransformDropdown";
import { toast } from "sonner";
import { AutosizeTextarea } from "@/components/ui/AutoSizeTextArea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { LoadingSection } from "@/components/whisper-page/LoadingSection";
import { CustomMarkdown } from "@/components/CustomMarkdown";
import { useTogetherApiKey } from "@/components/TogetherApiKeyProvider";
import { useLimits } from "@/components/hooks/useLimits";

export default function TranscriptionPageClient({ id }: { id: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedTransformationId, setSelectedTransformationId] = useState<
    string | null
  >(null);

  const {
    data: whisper,
    isLoading,
    error,
    refetch,
  } = useQuery(trpc.whisper.getWhisperWithTracks.queryOptions({ id }));

  const [editableTranscription, setEditableTranscription] = useState("");
  const [editableTitle, setEditableTitle] = useState("");

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const titleDebounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const trpcMutation = useMutation(
    trpc.whisper.updateFullTranscription.mutationOptions()
  );
  const titleMutation = useMutation(trpc.whisper.updateTitle.mutationOptions());
  const { apiKey } = useTogetherApiKey();
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const { transformationsData, isLoading: isLimitsLoading } = useLimits();

  // Helper: get all transformations from server only
  const getAllTransformations = () => {
    return whisper?.transformations || [];
  };

  // Helper: get display name for a transformation type
  const getTypeDisplayName = (typeName: string) => {
    const found = RECORDING_TYPES.find((t) => t.value === typeName);
    return found ? found.name : typeName;
  };

  // Helper: group and label transformations by type (with display names)
  const getLabeledTransformations = () => {
    const all = getAllTransformations();
    const grouped: Record<string, any[]> = {};
    all.forEach((t) => {
      if (!grouped[t.typeName]) grouped[t.typeName] = [];
      grouped[t.typeName].push(t);
    });
    // Sort each group by createdAt (oldest first)
    Object.values(grouped).forEach((arr) =>
      arr.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    );
    // Assign labels using display name
    const labeled: any[] = [];
    Object.entries(grouped).forEach(([type, arr]) => {
      const displayName = getTypeDisplayName(type);
      arr.forEach((t, idx) => {
        labeled.push({
          ...t,
          label: arr.length > 1 ? `${displayName} ${idx + 1}` : displayName,
        });
      });
    });
    return labeled;
  };

  // When whisper loads, set base transcription and title
  useEffect(() => {
    if (whisper?.fullTranscription) {
      setEditableTranscription(whisper.fullTranscription);
    }
    if (whisper?.title) {
      setEditableTitle(whisper.title);
    }
    // Default selection: base
    if (!selectedTransformationId) setSelectedTransformationId("base");
  }, [whisper?.fullTranscription, whisper?.title]);

  // When a transformation is selected, update the text shown
  const getSelectedTransformation = () => {
    if (selectedTransformationId === "base")
      return whisper?.fullTranscription || "";
    const all = getAllTransformations();
    const t = all.find((t) => t.id === selectedTransformationId);
    return t ? t.text : whisper?.fullTranscription || "";
  };

  // Handler for creating a transformation (streaming)
  const handleTransform = async (typeName: string) => {
    setIsStreaming(true);
    setStreamingText("");
    let newId: string | null = null;
    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { TogetherAPIToken: apiKey } : {}),
        },
        body: JSON.stringify({ whisperId: id, typeName }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      let buffer = "";
      let gotId = false;
      let text = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        buffer += chunk;
        // First line is the id JSON
        if (!gotId) {
          const newlineIdx = buffer.indexOf("\n");
          if (newlineIdx !== -1) {
            const idLine = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            try {
              const parsed = JSON.parse(idLine);
              newId = parsed.id;
              setSelectedTransformationId(newId);
              // Invalidate transformation limits
              await queryClient.invalidateQueries({
                queryKey: trpc.limit.getTransformationsLeft.queryKey(),
              });
            } catch (e) {
              // ignore
            }
            gotId = true;
          } else {
            continue;
          }
        }
        // The rest is streamed text
        text += buffer;
        setStreamingText(text);
        buffer = "";
      }
      setIsStreaming(false);
      setStreamingText("");
      // Refetch to get the final transformation from DB
      await refetch();
    } catch (err) {
      setIsStreaming(false);
      setStreamingText("");
      toast.error("Failed to generate transformation");
    }
  };

  // UI: loader for isGenerating or streaming
  const renderTranscription = () => {
    if (isStreaming) {
      return (
        <>
          {streamingText.length === 0 && <LoadingSection />}
          <div className="mt-2 whitespace-pre-line rounded p-2 min-h-[120px] w-full bg-white text-slate-800 flex flex-col gap-0.5 animate-pulse">
            <CustomMarkdown>{streamingText}</CustomMarkdown>
          </div>
        </>
      );
    }
    if (selectedTransformationId === "base") {
      return (
        <AutosizeTextarea
          className="whitespace-pre-line rounded p-2 min-h-[120px] w-full focus:outline-none resize-vertical"
          value={editableTranscription}
          onChange={(e) => {
            const value = e.target.value;
            setEditableTranscription(value);
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            debounceTimeout.current = setTimeout(() => {
              trpcMutation.mutate(
                { id, fullTranscription: value },
                {
                  onSuccess: () => {
                    toast.success("Transcription saved!", {
                      id: "transcription-save",
                    });
                  },
                  onError: () => {
                    toast.error("Failed to save transcription.", {
                      id: "transcription-save",
                    });
                  },
                }
              );
            }, 500);
          }}
          spellCheck={true}
          aria-label="Edit transcription"
          disabled={trpcMutation.status === "pending"}
        />
      );
    }
    // Find transformation
    const all = getAllTransformations();
    const t = all.find((t) => t.id === selectedTransformationId);
    if (!t) return null;
    if (t.isGenerating) {
      return <LoadingSection />;
    }
    return (
      <div className="whitespace-pre-line rounded p-2 min-h-[120px] w-full bg-white text-slate-800 flex flex-col gap-0.5">
        <CustomMarkdown>{t.text}</CustomMarkdown>
      </div>
    );
  };

  // Dropdown for selecting transformation
  const labeledTransformations = getLabeledTransformations();
  const isCurrentGenerating =
    selectedTransformationId !== "base" &&
    labeledTransformations.find((t) => t.id === selectedTransformationId)
      ?.isGenerating;

  // Polling logic: refetch if selected transformation is generating
  useEffect(() => {
    let attempts = 0;
    let timer: NodeJS.Timeout | null = null;
    const poll = async () => {
      const t = labeledTransformations.find(
        (t) => t.id === selectedTransformationId
      );
      if (
        selectedTransformationId !== "base" &&
        t &&
        t.isGenerating &&
        attempts < 5
      ) {
        attempts++;
        await refetch();
        timer = setTimeout(poll, 5000);
      }
    };
    // Start polling if needed
    const t = labeledTransformations.find(
      (t) => t.id === selectedTransformationId
    );
    if (selectedTransformationId !== "base" && t && t.isGenerating) {
      poll();
    }
    // Cleanup on unmount or when dependencies change
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [selectedTransformationId, labeledTransformations]);

  // Auto-trigger transformation if needed
  useEffect(() => {
    // Only run if whisper and limits are loaded, not streaming, and not already triggered
    if (
      !isStreaming &&
      !isLimitsLoading &&
      whisper &&
      Array.isArray(whisper.transformations) &&
      whisper.transformations.length === 0 &&
      whisper.initialTransformationType &&
      (apiKey || (transformationsData && transformationsData.remaining > 0))
    ) {
      console.log("trigger transformation", whisper.initialTransformationType);
      // Only trigger once per mount
      setIsStreaming(true); // Prevent double-trigger
      handleTransform(whisper.initialTransformationType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whisper, isLimitsLoading, transformationsData, apiKey]);

  if (error || (!whisper && !isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Whisper not found</h1>
          <button
            onClick={() => router.push("/whispers")}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Back to Whispers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="mx-auto max-w-[688px] w-full flex items-center gap-4">
          <input
            className="text-xl font-semibold bg-transparent border-none outline-none w-full"
            value={editableTitle}
            onChange={(e) => {
              const value = e.target.value;
              setEditableTitle(value);
              if (titleDebounceTimeout.current)
                clearTimeout(titleDebounceTimeout.current);
              titleDebounceTimeout.current = setTimeout(() => {
                titleMutation.mutate(
                  { id, title: value },
                  {
                    onSuccess: () => {
                      toast.success("Title saved!", { id: "title-save" });
                    },
                    onError: () => {
                      toast.error("Failed to save title.", {
                        id: "title-save",
                      });
                    },
                  }
                );
              }, 500);
            }}
            aria-label="Edit title"
            spellCheck={true}
            disabled={titleMutation.status === "pending"}
          />
          <Select
            value={selectedTransformationId || "base"}
            onValueChange={async (val) => {
              setSelectedTransformationId(val);
            }}
            disabled={isStreaming || isCurrentGenerating}
          >
            <SelectTrigger
              className={`flex justify-between items-center relative overflow-hidden gap-2 px-3 py-[5px] rounded-lg border-[0.5px] border-[#d1d5dc] min-w-[120px] ${
                isStreaming || isCurrentGenerating
                  ? "bg-slate-100 text-slate-400"
                  : "bg-white text-[#364153]"
              }`}
            >
              <SelectValue>
                <span className="text-sm text-center">
                  {isStreaming || isCurrentGenerating
                    ? "Generating..."
                    : (() => {
                        if (selectedTransformationId === "base")
                          return "Transcript";
                        const t = labeledTransformations.find(
                          (t) => t.id === selectedTransformationId
                        );
                        return t ? t.label : "Transcript";
                      })()}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">Transcript</SelectItem>
              {labeledTransformations.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                  {t.isGenerating && (
                    <span className="ml-2 animate-pulse text-xs text-slate-400">
                      ...
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>
      <main className="py-8 mx-auto max-w-[688px] w-full">
        {isLoading ? (
          <div className="px-8">
            <LoadingSection />
          </div>
        ) : (
          <div className="mb-6">{renderTranscription()}</div>
        )}
      </main>
      <footer className="fixed bottom-0 left-0 w-full md:left-1/2 md:-translate-x-1/2 bg-white border-t md:border md:rounded-2xl border-slate-200 px-4 py-3 flex flex-col md:flex-row items-center z-50 max-w-[730px] gap-2 justify-center md:mb-4">
        <TransformDropdown
          onTransform={handleTransform}
          isStreaming={isStreaming}
        />
        <div className="flex gap-2 w-full md:flex-row max-w-md md:max-w-auto justify-between items-center">
          {/* <button
            className="flex-1 py-2 rounded-lg border border-slate-200 bg-white text-[#364153] font-medium flex items-center justify-center gap-2 cursor-pointer"
            onClick={() => {
              setShowContinueModal(true);
            }}
          >
            <img src="/microphoneFull.svg" className="size-5 min-w-5 min-h-5" />
            <span>Continue</span>
          </button> */}
          <button
            className="flex-1 py-2 cursor-pointer rounded-lg border border-slate-200 bg-white text-[#364153] font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isStreaming || isCurrentGenerating}
            onClick={async () => {
              if (isStreaming || isCurrentGenerating) return;
              // just copy the transcript to clipboard
              await navigator.clipboard.writeText(getSelectedTransformation());
              toast.success("Copied to clipboard!", {
                id: "copy-to-clipboard",
              });
            }}
          >
            <img src="/copy.svg" className="size-5 min-w-5 min-h-5" />
            <span>Copy</span>
          </button>
          <Link
            href="/whispers"
            className="flex-1 py-2 rounded-lg border border-slate-200 bg-white text-[#364153] font-medium flex items-center justify-center gap-2"
          >
            <img src="/new.svg" className="size-5 min-w-5 min-h-5" />
            <span>New</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
