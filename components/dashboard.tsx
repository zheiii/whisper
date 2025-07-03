"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Upload, Search, Star, MessageCircle, User } from "lucide-react";
import { RecordingModal } from "@/components/recording-modal";
import type { Transcription } from "@/app/page";
import { useRouter } from "next/navigation";

interface DashboardProps {
  transcriptions: Transcription[];
  onAddTranscription: (transcription: Omit<Transcription, "id">) => void;
  onSelectTranscription: (transcription: Transcription) => void;
}

export function Dashboard({
  transcriptions,
  onAddTranscription,
  onSelectTranscription,
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const router = useRouter();

  const filteredTranscriptions = transcriptions.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewWhisper = () => {
    setShowRecordingModal(true);
  };

  const handleUploadVoiceNote = () => {
    // Simulate file upload
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Simulate transcription
        setTimeout(() => {
          onAddTranscription({
            title: `Uploaded: ${file.name}`,
            content:
              "This is a simulated transcription of your uploaded audio file. In a real implementation, this would be processed by Whisper AI to convert speech to text.",
            preview:
              "This is a simulated transcription of your uploaded audio file...",
            timestamp: new Date().toLocaleDateString(),
            duration: "2:34",
          });
        }, 1000);
      }
    };
    input.click();
  };

  return (
    <>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-6">Your Whispers</h1>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Empty State or Transcriptions List */}
          {filteredTranscriptions.length === 0 && searchQuery === "" ? (
            <div className="text-center py-16">
              <h2 className="text-xl font-semibold mb-2">
                Welcome, whisperer!
              </h2>
              <p className="text-muted-foreground mb-8">
                Start by creating a new Whisper, or
                <br />
                upload a voice note for
                <br />
                transcription
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTranscriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  onClick={() => onSelectTranscription(transcription)}
                  className="bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 mb-1">
                        {transcription.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {transcription.preview}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{transcription.timestamp}</span>
                        {transcription.duration && (
                          <span>{transcription.duration}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col gap-3 w-full max-w-sm px-6">
          <Button
            variant="outline"
            size="lg"
            onClick={handleUploadVoiceNote}
            className="w-full bg-transparent"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Voice Note
          </Button>
          <Button
            size="lg"
            onClick={handleNewWhisper}
            className="w-full bg-slate-900 hover:bg-slate-800"
          >
            <Mic className="w-4 h-4 mr-2" />
            New Whisper
          </Button>
        </div>
      </div>

      {/* Recording Modal */}
      {showRecordingModal && (
        <RecordingModal
          onClose={() => setShowRecordingModal(false)}
          onSave={onAddTranscription}
        />
      )}
    </>
  );
}
