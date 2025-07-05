"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { RecordingModal } from "@/components/recording-modal";
import type { Transcription } from "@/app/page";
import { UploadModal } from "./UploadModal";

interface DashboardProps {
  transcriptions: Transcription[];
  onAddTranscription: (transcription: Omit<Transcription, "id">) => void;
}

export function Dashboard({
  transcriptions,
  onAddTranscription,
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filteredTranscriptions = searchQuery
    ? transcriptions.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transcriptions;

  console.log("filteredTranscriptions", filteredTranscriptions);

  const handleNewWhisper = () => {
    setShowRecordingModal(true);
  };

  const handleUploadVoiceNote = () => {
    setShowUploadModal(true);
  };

  return (
    <>
      <div className=" mx-auto">
        <div className="mb-8">
          <div className="mx-auto max-w-[729px] w-full md:rounded-xl bg-white border-b-[0.7px] md:border-[0.7px] border-gray-200 md:border-[#d1d5dc] px-6 py-5 flex flex-col gap-3 md:my-4 ">
            <h1 className="text-xl font-semibold text-left text-[#101828]">
              Your Whispers
            </h1>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Empty State or Transcriptions List */}
          {filteredTranscriptions.length === 0 && searchQuery === "" ? (
            <div className="text-center py-16 flex flex-col items-center">
              <h2 className="text-xl font-medium text-left text-black mb-2">
                Welcome, whisperer!
              </h2>
              <p className="max-w-[264px] text-base text-center text-[#364153] mb-8">
                Start by creating a new Whisper, or
                <br />
                upload a voice note for
                <br />
                transcription
              </p>
            </div>
          ) : (
            <div className="space-y-4 mx-auto max-w-[455px]">
              {filteredTranscriptions.map((transcription) => (
                <a
                  target="_blank"
                  href={`/whispers/${transcription.id}`}
                  key={transcription.id}
                  className="bg-white rounded-lg p-4 cursor-pointer"
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
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[688px] flex justify-center items-center px-6 pb-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3 w-full">
            <Button
              variant="outline"
              size="lg"
              onClick={handleUploadVoiceNote}
              className="w-full rounded-lg bg-gray-100 border border-[#d1d5dc] text-base h-[42px]"
            >
              <img src="/upload.svg" className="w-5 h-5 size-5" />
              Upload Voice Note
            </Button>
            <Button
              size="lg"
              onClick={handleNewWhisper}
              className="w-full bg-[#101828] text-base text-left text-white rounded-lg h-[42px]"
            >
              <img src="/microphone.svg" className="w-5 h-5 size-5" />
              New Whisper
            </Button>
          </div>
        </div>
      </div>

      {/* Recording Modal */}
      {showRecordingModal && (
        <RecordingModal
          onClose={() => setShowRecordingModal(false)}
          onSave={onAddTranscription}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} />
      )}
    </>
  );
}
