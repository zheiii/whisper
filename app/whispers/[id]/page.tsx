"use client";

import { useRouter, useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export default function TranscriptionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const trpc = useTRPC();

  const {
    data: whisper,
    isLoading,
    error,
  } = useQuery(trpc.whisper.getWhisperWithTracks.queryOptions({ id }));

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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{whisper.title}</h1>
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
      <main className="px-6 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">Transcript</h2>
          <p className="whitespace-pre-line">{whisper.fullTranscription}</p>
        </div>
        <div>
          <h2 className="text-lg font-medium mb-2">Audio Tracks</h2>
          <ul>
            {whisper.audioTracks.map((track) => (
              <li key={track.id} className="mb-4">
                <audio controls src={track.fileUrl} className="w-full mb-1" />
                <div className="text-xs text-muted-foreground">
                  {new Date(track.createdAt).toLocaleString()}
                </div>
                <div className="text-sm">{track.partialTranscription}</div>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 px-4 py-3 flex flex-col items-center z-50">
        <button className="w-full max-w-md mb-2 bg-slate-900 text-white py-2 rounded-lg font-semibold text-base flex items-center justify-center gap-2">
          ✨ Transform
        </button>
        <div className="flex gap-2 w-full max-w-md justify-between">
          <button className="flex-1 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium flex items-center justify-center gap-2">
            <span role="img" aria-label="mic">
              🎤
            </span>{" "}
            Continue
          </button>
          <button className="flex-1 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium flex items-center justify-center gap-2">
            Copy
          </button>
          <button className="flex-1 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium flex items-center justify-center gap-2">
            + New
          </button>
        </div>
      </footer>
    </div>
  );
}
