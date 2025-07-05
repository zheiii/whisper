"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Dropzone from "react-dropzone";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { useS3Upload } from "next-s3-upload";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

export function UploadModal({ onClose }: { onClose: () => void }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const { uploadToS3 } = useS3Upload();
  const router = useRouter();
  const trpc = useTRPC();
  const transcribeMutation = useMutation(
    trpc.whisper.transcribeFromS3.mutationOptions()
  );

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        toast.error(
          "Bad file selected. Please make sure to select an audio file."
        );
        return;
      }
      try {
        // Upload to S3
        const { url } = await uploadToS3(file);
        // Call tRPC mutation
        const { id } = await transcribeMutation.mutateAsync({ audioUrl: url });
        // Redirect to whisper page
        router.push(`/whispers/${id}`);
      } catch (err) {
        toast.error("Failed to transcribe audio. Please try again.");
      }
    },
    [uploadToS3, transcribeMutation, router]
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[392px] !p-0 border border-gray-200 rounded-tl-xl rounded-tr-xl bg-white overflow-hidden gap-0"
      >
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Upload Voice Audio</DialogTitle>
        </DialogHeader>
        <Dropzone
          multiple={false}
          accept={{
            // MP3 audio
            "audio/mpeg3": [".mp3"],
            "audio/x-mpeg-3": [".mp3"],
            // WAV audio
            "audio/wav": [".wav"],
            "audio/x-wav": [".wav"],
            "audio/wave": [".wav"],
            "audio/x-pn-wav": [".wav"],
            // iPhone voice notes (M4A)
            "audio/mp4": [".m4a"],
            "audio/m4a": [".m4a"],
            "audio/x-m4a": [".m4a"],
          }}
          onDrop={handleDrop}
          onDragEnter={() => setIsDragActive(true)}
          onDragLeave={() => setIsDragActive(false)}
          onDropAccepted={() => setIsDragActive(false)}
          onDropRejected={() => setIsDragActive(false)}
        >
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className="flex flex-col justify-start items-start w-[392px] h-[347px] relative overflow-hidden rounded-2xl bg-white border border-gray-200"
              style={{
                border: isDragActive
                  ? "2px solid #2563eb"
                  : "1px solid #e5e7eb",
                boxShadow: isDragActive ? "0 0 0 4px #93c5fd" : undefined,
                transition: "border 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
            >
              <input {...getInputProps()} />
              <div className="self-stretch flex-grow-0 flex-shrink-0 h-[307px] relative bg-white border border-gray-200">
                <div className="w-[352px] h-[267px] absolute left-5 top-5 overflow-hidden rounded-xl bg-gray-100 border-2 border-[#d1d5dc] border-dashed">
                  <div className="flex justify-center items-center h-9 absolute left-[75px] top-[102px] overflow-hidden gap-2.5 px-3 py-2 rounded-lg bg-[#101828]">
                    <img
                      src="/uploadWhite.svg"
                      className="size-[18px] min-w-[18px]"
                    />
                    <p className="flex-grow-0 flex-shrink-0 text-base font-semibold text-left text-white">
                      Upload a Recording
                    </p>
                  </div>
                  <p className="absolute left-[113px] top-[150px] text-xs text-center text-[#4a5565]">
                    Or drag‑and‑drop here
                  </p>
                  {isDragActive && (
                    <div className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center z-10 pointer-events-none">
                      <span className="text-blue-700 font-semibold">
                        Drop audio file here
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="self-stretch flex-grow-0 flex-shrink-0 h-10 relative overflow-hidden">
                <p className="absolute left-5 top-3 text-sm text-left">
                  <span className="text-sm font-light text-left text-[#4a5565]">
                    Recordings left:{" "}
                  </span>
                  <span className="text-sm font-medium text-left text-[#101828]">
                    5
                  </span>
                </p>
              </div>
            </div>
          )}
        </Dropzone>
      </DialogContent>
    </Dialog>
  );
}
