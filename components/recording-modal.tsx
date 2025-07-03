"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordingModalProps {
  onClose: () => void;
  onSave: (transcription: {
    title: string;
    content: string;
    preview: string;
    timestamp: string;
    duration?: string;
  }) => void;
  title?: string;
}

// Extend the Window interface
declare global {
  interface Window {
    currentMediaRecorder: MediaRecorder | undefined;
    currentStream: MediaStream | undefined;
  }
}

export const BeforeRecording = ({
  noteType,
  setNoteType,
}: {
  noteType: string;
  setNoteType: (noteType: string) => void;
}) => {
  return (
    <>
      {/* Middle section: Note type selection */}
      <div className="w-full flex flex-col px-5 py-6 border-y border-gray-200">
        <div className="flex items-center mb-2">
          <span className="text-base font-medium text-left text-[#101828] mr-1">
            What are you creating?
          </span>
          <span className="text-base font-medium text-left text-[#6a7282]">
            [OPTIONAL]
          </span>
        </div>
        <div className="w-full">
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="w-full h-9 bg-gray-100 border border-[#d1d5dc] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quick-note">📝 Quick note</SelectItem>
              <SelectItem value="meeting-notes">📋 Meeting notes</SelectItem>
              <SelectItem value="voice-memo">🎤 Voice memo</SelectItem>
              <SelectItem value="idea">💡 Idea</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Bottom section: Recordings left */}
      <div className="w-full flex flex-col py-3 px-5">
        <div className="text-sm font-light text-[#4a5565]">
          Recordings left: 5
        </div>
      </div>
    </>
  );
};

// Dynamic waveform component
function Waveform({ isRecording }: { isRecording: boolean }) {
  const [dataArray, setDataArray] = useState<number[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isRecording) {
      setDataArray([]);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (analyserRef.current) analyserRef.current.disconnect();
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      analyserRef.current = null;
      sourceRef.current = null;
      audioContextRef.current = null;
      return;
    }
    let isMounted = true;
    const setup = async () => {
      try {
        const stream = window.currentStream;
        if (!stream) return;
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const dataArr = new Uint8Array(bufferLength);
        function draw() {
          analyser.getByteTimeDomainData(dataArr);
          // Normalize and map to bar heights
          const bars = Array.from(dataArr).map((v) => (v - 128) / 128);
          if (isMounted) setDataArray(bars);
          animationRef.current = requestAnimationFrame(draw);
        }
        draw();
      } catch (e) {
        // ignore
      }
    };
    setup();
    return () => {
      isMounted = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (analyserRef.current) analyserRef.current.disconnect();
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      analyserRef.current = null;
      sourceRef.current = null;
      audioContextRef.current = null;
    };
  }, [isRecording]);

  // Render bars
  return (
    <div className="w-52 h-4 flex items-end gap-[1.5px] relative overflow-hidden">
      {dataArray.length > 0
        ? dataArray.map((v, i) => (
            <div
              key={i}
              className="bg-[#4a5565]"
              style={{
                width: "1.43px",
                height: `${Math.max(6, Math.abs(v) * 16)}px`,
                borderRadius: "1px",
                transition: "height 0.08s linear",
              }}
            />
          ))
        : Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#e5e7eb]"
              style={{ width: "1.43px", height: "8px", borderRadius: "1px" }}
            />
          ))}
    </div>
  );
}

export function RecordingModal({
  onClose,
  onSave,
  title = "New Whisper",
}: RecordingModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [noteType, setNoteType] = useState("quick-note");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);

  // Recording time logic without intervalRef
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isRecording) {
      timer = setTimeout(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
      // Stop recording if modal is closed while recording
      if (
        window.currentMediaRecorder &&
        window.currentMediaRecorder.state !== "inactive"
      ) {
        window.currentMediaRecorder.stop();
      }
      if (window.currentStream) {
        window.currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isRecording, recordingTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartRecording = async () => {
    console.log("handleStartRecording");
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setRecordingTime(0);
      setHasRecording(false);
      const mediaRecorder = new MediaRecorder(stream);
      window.currentMediaRecorder = mediaRecorder;
      window.currentStream = stream;
      mediaRecorder.start();
    } catch (error) {
      console.error("Microphone access error:", error);
      alert("Microphone access is required to record audio.");
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setHasRecording(true);
    if (
      window.currentMediaRecorder &&
      window.currentMediaRecorder.state !== "inactive"
    ) {
      window.currentMediaRecorder.stop();
    }
    if (window.currentStream) {
      window.currentStream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleSaveRecording = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const sampleTranscriptions = [
        "I had a great meeting today with the team. We discussed the new project timeline and everyone seems excited about the upcoming features. Need to follow up with Sarah about the design mockups.",
        "Reminder to pick up groceries on the way home. Need milk, bread, eggs, and don't forget the cat food. Also need to call mom about dinner plans for Sunday.",
        "Just finished reading an interesting article about artificial intelligence and its impact on productivity. The key takeaway is that AI tools can help us focus on more creative tasks while handling routine work.",
        "Meeting notes from today's standup: John is working on the authentication system, Lisa is finishing up the dashboard components, and I need to review the API documentation before tomorrow's client call.",
      ];
      const randomTranscription =
        sampleTranscriptions[
          Math.floor(Math.random() * sampleTranscriptions.length)
        ];
      const preview =
        randomTranscription.length > 100
          ? randomTranscription.substring(0, 100) + "..."
          : randomTranscription;
      onSave({
        title: `${
          noteType === "quick-note" ? "Quick Note" : "Voice Memo"
        } - ${new Date().toLocaleDateString()}`,
        content: randomTranscription,
        preview,
        timestamp: new Date().toLocaleDateString(),
        duration: formatTime(recordingTime),
      });
      setIsProcessing(false);
      onClose();
    }, 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="!max-w-[392px] !p-0 border border-gray-200 rounded-tl-xl rounded-tr-xl bg-white overflow-hidden">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">{title}</DialogTitle>
        </DialogHeader>
        {/* Top section: dark rounded rectangle with recording button */}
        <div className="flex flex-col items-center w-full bg-white">
          <Button
            className={cn(
              isRecording ? "bg-[#6D1414]" : "bg-[#101828]",
              "w-[352px] h-[86px] rounded-xl flex flex-col items-center justify-center mb-5"
            )}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
          >
            {isRecording ? (
              <img
                src="/stop.svg"
                className="min-w-9 min-h-9 size-9 text-white"
              />
            ) : (
              <img
                src="/microphone.svg"
                className="min-w-9 min-h-9 size-9 text-white"
              />
            )}
          </Button>

          {!isRecording ? (
            <BeforeRecording noteType={noteType} setNoteType={setNoteType} />
          ) : (
            <div className="flex flex-row gap-8">
              <div className="size-10 bg-[#FFEEEE] p-2.5 rounded-xl">
                <img src="/X.svg" className="size-5 min-w-5" />
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-base text-center text-[#364153]">
                  {formatTime(recordingTime)}
                </p>
                <Waveform isRecording={isRecording} />
              </div>

              <div className="size-10 bg-[#1E2939] p-2.5 rounded-xl">
                <img src="/pause.svg" className="size-5 min-w-5" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
