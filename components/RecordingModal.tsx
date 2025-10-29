"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RecordingBasics } from "./RecordingBasics";
import { useTRPC } from "@/trpc/client";
import { RecordingMinutesLeft } from "./RecordingMinutesLeft";
import { useApiKeys } from "./ApiKeysProvider";
import useLocalStorage from "./hooks/useLocalStorage";
import { AudioWaveform } from "./AudioWaveform";
import { useAudioRecording } from "./hooks/useAudioRecording";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLimits } from "./hooks/useLimits";
import { useS3Upload } from "next-s3-upload";
import {
  getLatestRecording,
  deleteRecording,
  deleteOldRecordings,
  hasActiveRecording,
} from "@/lib/recordingStorage";

interface RecordingModalProps {
  onClose: () => void;
  title?: string;
}

// Extend the Window interface
declare global {
  interface Window {
    currentMediaRecorder: MediaRecorder | undefined;
    currentStream: MediaStream | undefined;
  }
}

export function RecordingModal({ onClose }: RecordingModalProps) {
  const [language, setLanguage] = useLocalStorage("language", "en");
  const [recordSystemAudio, setRecordSystemAudio] = useLocalStorage("recordSystemAudio", false);


  // Check for saved recordings on mount (for recovery from crashes/disconnections)
  useEffect(() => {
    const checkForSavedRecording = async () => {
      try {
        // Clean up old recordings (older than 24 hours)
        await deleteOldRecordings();

        // Check if there's an interrupted recording to recover
        const hasActive = await hasActiveRecording();
        if (hasActive) {
          const latest = await getLatestRecording();
          if (latest && latest.duration > 5) { // Only recover if recording was > 5 seconds
            const success = await recoverRecording(latest);
            if (success) {
              toast.success(
                `Recovered interrupted recording (${Math.floor(latest.duration / 60)}:${(latest.duration % 60).toString().padStart(2, '0')}). You can save it now.`,
                { duration: 8000 }
              );
            } else {
              await deleteRecording(latest.id);
            }
          } else if (latest) {
            // Too short, just delete it
            await deleteRecording(latest.id);
          }
        }
      } catch (err) {
        // Silently handle error
      }
    };

    checkForSavedRecording();
  }, [recoverRecording]);

  const { uploadToS3 } = useS3Upload();

  const {
    recording,
    paused,
    audioBlob,
    analyserNode,
    duration,
    systemAudioActive,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    recoverRecording,
  } = useAudioRecording({ recordSystemAudio });


  const trpc = useTRPC();
  const { whisperKey } = useApiKeys();
  const isBYOK = !!whisperKey;

  const { isLoading, minutesData } = useLimits();

  const router = useRouter();
  const transcribeMutation = useMutation(
    trpc.whisper.transcribeFromS3.mutationOptions()
  );

  const queryClient = useQueryClient();

  const [isProcessing, setIsProcessing] = useState<
    "idle" | "uploading" | "transcribing"
  >("idle");
  const [pendingSave, setPendingSave] = useState(false);

  // Check microphone permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.permissions) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((result) => {
          // setMicPermission(result.state as "granted" | "denied" | "prompt");
          result.onchange = () => {};
        });
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSaveRecording = async () => {
    if (!audioBlob) {
      toast.error("No audio to save. Please record something first.");
      return;
    }
    setIsProcessing("uploading");
    try {
      // Upload to S3
      const file = new File([audioBlob], `recording-${Date.now()}.webm`, {
        type: "audio/webm",
      });
      const { url, key, bucket } = await uploadToS3(file);
      if (!key) {
        throw new Error("Upload succeeded but no S3 key was returned.");
      }

      // Call tRPC mutation
      setIsProcessing("transcribing");

      const { id } = await transcribeMutation.mutateAsync({
        audioUrl: url,
        language,
        durationSeconds: duration,
        s3Key: key,
        s3Bucket: bucket,
      });

      // Clean up saved recording data after successful upload
      try {
        const latest = await getLatestRecording();
        if (latest) {
          await deleteRecording(latest.id);
        }
      } catch (err) {
        // Non-critical error, continue
      }

      // Invalidate dashboard query
      await queryClient.invalidateQueries({
        queryKey: trpc.whisper.listWhispers.queryKey(),
      });
      // Redirect to whisper page
      router.push(`/whispers/${id}`);
    } catch (err) {
      toast.error("Failed to transcribe audio. Please try again.");
      setIsProcessing("idle");
    }
  };

  // Wait for audioBlob to be set after stopping before saving
  useEffect(() => {
    if (pendingSave && audioBlob) {
      setPendingSave(false);
      handleSaveRecording();
    }
  }, [pendingSave, audioBlob]);

  // Alert when system audio stops during recording
  useEffect(() => {
    if (recording && recordSystemAudio && !systemAudioActive) {
      toast.error("System audio stopped! You may have switched to the shared tab. Switch back to continue recording system audio.", {
        duration: 5000,
      });
    }
  }, [recording, recordSystemAudio, systemAudioActive]);

  // Prevent page unload/refresh during recording
  useEffect(() => {
    if (recording) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "Recording in progress. Are you sure you want to leave?";
        return e.returnValue;
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [recording]);

  // Request wake lock to prevent tab from being discarded by Chrome
  useEffect(() => {
    if (!recording) return;

    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && document.visibilityState === "visible") {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch (err) {
        // Wake lock failed, continue without it
      }
    };

    requestWakeLock();

    // Monitor visibility changes during recording
    const handleVisibilityChange = async () => {
      if (!document.hidden && (!wakeLock || wakeLock.released)) {
        try {
          if ("wakeLock" in navigator) {
            wakeLock = await (navigator as any).wakeLock.request("screen");
          }
        } catch (err) {
          // Wake lock failed, continue without it
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [recording]);

  // Prevent modal from closing while recording
  const handleOpenChange = (open: boolean) => {
    if (!open && recording) {
      return; // Don't allow closing while recording
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[392px] !p-0 border border-gray-200 rounded-tl-xl rounded-tr-xl bg-white overflow-hidden gap-0"
        onEscapeKeyDown={(e) => {
          if (recording) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (recording) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Recording Modal</DialogTitle>
        </DialogHeader>

        {isProcessing !== "idle" ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
            <img
              src="/loading.svg"
              alt="Loading"
              className="w-8 h-8 animate-spin"
            />
            <p className="text-gray-500">
              {isProcessing === "uploading"
                ? "Uploading audio recording"
                : "Transcribing audio..."}
              <span className="animate-pulse">...</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full bg-white">
            {!recording ? (
              <>
                <RecordingBasics
                  language={language}
                  setLanguage={setLanguage}
                />
                <div className="w-[352px] px-5 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#364153]">
                    <input
                      type="checkbox"
                      checked={recordSystemAudio}
                      onChange={(e) => setRecordSystemAudio(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#101828] focus:ring-2 focus:ring-[#101828]"
                    />
                    <span>Record system audio (tab/screen audio)</span>
                  </label>
                  {recordSystemAudio && (
                    <div className="text-xs text-gray-600 mt-2 ml-6 space-y-1 bg-blue-50 p-2 rounded border border-blue-200">
                      <p className="font-semibold text-blue-900">Important:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Select tab/screen and check "Share tab audio"</li>
                        <li><span className="font-semibold">Chrome will switch to that tab - immediately switch back here!</span></li>
                        <li>Stay on this Whisper tab - audio records even if tab isn't visible</li>
                      </ol>
                      <p className="text-blue-700 mt-1">💡 Or share "Entire Screen" to allow tab switching</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="flex flex-row gap-8 mt-8">
                  {/* X Button: Reset recording */}
                  <button
                    className="size-10 bg-[#FFEEEE] p-2.5 rounded-xl cursor-pointer"
                    onClick={resetRecording}
                    type="button"
                    aria-label="Reset recording"
                  >
                    <img src="/X.svg" className="size-5 min-w-5" />
                  </button>

                  <div className="flex flex-col gap-1">
                    <p className="text-base text-center text-[#364153]">
                      {formatTime(duration)}
                    </p>
                    <AudioWaveform
                      analyserNode={analyserNode}
                      isPaused={paused}
                    />
                  </div>

                  {/* Pause/Resume Button */}
                  {paused ? (
                    <button
                      className="size-10 bg-[#1E2939] p-2.5 rounded-xl cursor-pointer"
                      onClick={resumeRecording}
                      type="button"
                      aria-label="Resume recording"
                    >
                      <img src="/microphone.svg" className="size-5 min-w-5" />
                    </button>
                  ) : (
                    <button
                      className="size-10 bg-[#1E2939] p-2.5 rounded-xl cursor-pointer"
                      onClick={pauseRecording}
                      type="button"
                      aria-label="Pause recording"
                    >
                      <img src="/pause.svg" className="size-5 min-w-5" />
                    </button>
                  )}
                </div>

                {/* System Audio Status Indicator */}
                {recordSystemAudio && (
                  <div className={cn(
                    "mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2",
                    systemAudioActive
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  )}>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      systemAudioActive ? "bg-green-600 animate-pulse" : "bg-red-600"
                    )} />
                    {systemAudioActive
                      ? "System audio recording"
                      : "System audio stopped - switch back to this tab!"}
                  </div>
                )}
              </div>
            )}

            <Button
              className={cn(
                recording ? "bg-[#6D1414]" : "bg-[#101828]",
                "w-[352px] h-[86px] rounded-xl flex flex-row gap-3 items-center justify-center my-5"
              )}
              onClick={async () => {
                if (recording) {
                  stopRecording();
                  setPendingSave(true);
                } else {
                  startRecording();
                }
              }}
              disabled={isProcessing !== "idle"}
            >
              {recording ? (
                <>
                  <img
                    src="/stop.svg"
                    className="min-w-7 min-h-7 size-7 text-white"
                  />
                  <p>Stop Recording</p>
                </>
              ) : (
                <img
                  src="/microphone.svg"
                  className="min-w-9 min-h-9 size-9 text-white"
                />
              )}
            </Button>

            {!recording && (
              <div className="w-full flex flex-col py-3 px-5 border-t border-gray-200">
                {isLoading ? (
                  <span className="text-sm text-[#4a5565]">Loading...</span>
                ) : (
                  <RecordingMinutesLeft
                    minutesLeft={
                      isBYOK ? Infinity : minutesData?.remaining ?? 0
                    }
                  />
                )}
                {/* No Save button, processing is automatic */}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
