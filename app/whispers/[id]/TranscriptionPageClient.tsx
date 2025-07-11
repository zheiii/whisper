"use client";

import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatWhisperTimestamp } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { TransformDropdown } from "@/components/TransformDropdown";
import { toast } from "sonner";
import { AutosizeTextarea } from "@/components/ui/AutoSizeTextArea";

export default function TranscriptionPageClient({ id }: { id: string }) {
  const router = useRouter();
  const trpc = useTRPC();

  const {
    data: whisper,
    isLoading,
    error,
  } = useQuery(trpc.whisper.getWhisperWithTracks.queryOptions({ id }));

  const [editableTranscription, setEditableTranscription] = useState("");
  const [editableTitle, setEditableTitle] = useState("");
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const titleDebounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const trpcMutation = useMutation(
    trpc.whisper.updateFullTranscription.mutationOptions()
  );
  const titleMutation = useMutation(trpc.whisper.updateTitle.mutationOptions());

  useEffect(() => {
    if (whisper?.fullTranscription) {
      setEditableTranscription(whisper.fullTranscription);
    }
    if (whisper?.title) {
      setEditableTitle(whisper.title);
    }
  }, [whisper?.fullTranscription, whisper?.title]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }
  if (error || !whisper) {
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
        <div className="mx-auto max-w-[688px] w-full">
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
          <div className="text-xs text-muted-foreground">
            Last edited: {new Date(whisper.createdAt).toLocaleDateString()} –{" "}
            {new Date(whisper.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        {/* Add your transcript dropdown/actions here */}
      </header>
      <main className="py-8 mx-auto max-w-[688px] w-full">
        <div className="mb-6">
          <AutosizeTextarea
            className="whitespace-pre-line rounded p-2 min-h-[120px] w-full focus:outline-none resize-vertical"
            value={editableTranscription}
            onChange={(e) => {
              const value = e.target.value;
              setEditableTranscription(value);
              if (debounceTimeout.current)
                clearTimeout(debounceTimeout.current);
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
        </div>
        <div>
          <h2 className="text-lg font-medium mb-2">Audio Tracks used RAW</h2>
          <ul>
            {whisper.audioTracks.map((track: any) => (
              <li key={track.id} className="mb-4">
                <audio controls src={track.fileUrl} className="w-full mb-1" />
                <div className="text-xs text-muted-foreground">
                  {formatWhisperTimestamp(track.createdAt)}
                </div>
                <div className="text-sm">{track.partialTranscription}</div>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <footer className="fixed bottom-0 left-0 w-full md:left-1/2 md:-translate-x-1/2 bg-white border-t md:border md:rounded-2xl border-slate-200 px-4 py-3 flex flex-col md:flex-row items-center z-50 max-w-[730px] gap-2 justify-center md:mb-4">
        <TransformDropdown />
        <div className="flex gap-2 w-full md:flex-row max-w-md md:max-w-auto justify-between items-center">
          <button className="flex-1 py-2 rounded-lg border border-slate-200 bg-white text-[#364153] font-medium flex items-center justify-center gap-2">
            <img src="/microphoneFull.svg" className="size-5 min-w-5 min-h-5" />
            <span>Continue</span>
          </button>
          <button
            className="flex-1 py-2 cursor-pointer rounded-lg border border-slate-200 bg-white text-[#364153] font-medium flex items-center justify-center gap-2"
            onClick={async () => {
              // just copy the transcript to clipboard
              await navigator.clipboard.writeText(editableTranscription);
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
