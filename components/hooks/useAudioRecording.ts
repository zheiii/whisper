import { useCallback, useEffect, useRef, useState } from "react";
import {
  saveRecordingMetadata,
  saveAudioChunk,
  getRecordingChunks,
  deleteRecording,
  RecordingMetadata,
} from "@/lib/recordingStorage";

/**
 * Configuration options for audio recording
 *
 * @property recordSystemAudio - When true (default), captures both microphone and system audio.
 *   Uses getDisplayMedia() to capture screen/tab audio alongside microphone input.
 *
 * CROSS-PLATFORM COMPATIBILITY NOTES:
 *
 * Browser Limitations:
 * - True "system audio" (all computer sounds) is NOT available in web browsers
 * - Instead, we use getDisplayMedia() which captures screen/tab audio (similar to Loom/Notion)
 * - Users must select which screen/tab to share when recording starts
 *
 * Windows:
 * - Chrome/Edge: Full support for screen sharing with audio
 * - Firefox: Limited support, may require additional configuration
 * - Audio from specific apps/tabs can be captured
 *
 * macOS:
 * - Chrome/Edge/Safari: Full support for screen sharing with audio
 * - May prompt for screen recording permissions in System Preferences
 * - Audio from specific apps/tabs can be captured
 *
 * Permissions Required:
 * - Microphone: Always required (getUserMedia)
 * - Screen Recording: Required when recordSystemAudio is true (getDisplayMedia)
 * - Users will see browser permission prompts on first use
 *
 * Behavior:
 * - If user cancels screen selection, recording continues with microphone only
 * - Both audio sources are merged into a single track using Web Audio API
 * - Video from screen share is immediately stopped (audio-only capture)
 */
export interface UseAudioRecordingOptions {
  recordSystemAudio?: boolean;
}

/**
 * Hook for recording audio from microphone and optionally system/display audio
 *
 * @param options - Configuration options
 * @returns Recording state and control functions
 */
export function useAudioRecording(options: UseAudioRecordingOptions = {}) {
  const { recordSystemAudio = false } = options;
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [systemAudioActive, setSystemAudioActive] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityListenerRef = useRef<(() => void) | null>(null);
  const recordingIdRef = useRef<string | null>(null);
  const chunkCountRef = useRef<number>(0);
  const metadataUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up all resources
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((track) => track.stop());
      displayStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (visibilityListenerRef.current) {
      document.removeEventListener("visibilitychange", visibilityListenerRef.current);
      visibilityListenerRef.current = null;
    }
    setAnalyserNode(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (metadataUpdateTimerRef.current) {
      clearInterval(metadataUpdateTimerRef.current);
      metadataUpdateTimerRef.current = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    cleanup();
    setError(null);
    setDuration(0);
    chunksRef.current = [];
    chunkCountRef.current = 0;

    // Generate unique recording ID for persistence
    recordingIdRef.current = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get microphone audio
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = micStream;

      // Create audio context for mixing
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Resume audio context if suspended (required for some browsers)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Create destination for mixed audio
      const destination = audioContext.createMediaStreamDestination();

      // Connect microphone to destination
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);

      // Optionally capture system/display audio
      if (recordSystemAudio) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: "browser",
            },
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
          displayStreamRef.current = displayStream;

          // Check if audio context is still valid after async getDisplayMedia
          if (audioContext.state === "closed") {
            setError("AudioContext closed during setup - recording with microphone only");
            setSystemAudioActive(false);
            displayStream.getTracks().forEach(track => track.stop());
            displayStreamRef.current = null;
          } else if (audioContext.state === "suspended") {
            await audioContext.resume();
          }

          if (audioContext.state === "running") {
            const audioTracks = displayStream.getAudioTracks();

            if (audioTracks.length > 0) {
              const displayAudioStream = new MediaStream(audioTracks);
              const displaySource = audioContext.createMediaStreamSource(displayAudioStream);
              displaySource.connect(destination);
              setSystemAudioActive(true);

              // Monitor if display audio track ends
              audioTracks[0].addEventListener("ended", () => {
                setSystemAudioActive(false);
              });
            }

            // Keep video track running to maintain the stream
            const videoTracks = displayStream.getVideoTracks();
            if (videoTracks.length > 0) {
              videoTracks[0].addEventListener("ended", () => {
                // Screen sharing stopped
              });
            }
          }
        } catch (displayErr) {
          // User cancelled display selection or no audio available
        }
      }

      // Use the mixed stream for recording
      const mixedStream = destination.stream;

      // Create MediaRecorder with mixed stream
      const mediaRecorder = new MediaRecorder(mixedStream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      // Create analyser for visualization (connected to MIXED audio, not just mic)
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      // Connect to destination to capture both mic AND system audio
      const analyserSource = audioContext.createMediaStreamSource(destination.stream);
      analyserSource.connect(analyser);

      analyserRef.current = analyser;
      setAnalyserNode(analyser);

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);

          // Save chunk to IndexedDB for persistence (crash/disconnect recovery)
          if (recordingIdRef.current) {
            try {
              await saveAudioChunk({
                recordingId: recordingIdRef.current,
                chunkIndex: chunkCountRef.current,
                blob: e.data,
                timestamp: Date.now(),
              });
              chunkCountRef.current++;
            } catch (err) {
              // Silently handle chunk save error
            }
          }
        }
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      // Final check: ensure AudioContext is still valid
      if (audioContext.state === "closed") {
        throw new Error("AudioContext was closed before recording could start");
      }

      // Resume context if suspended
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Start with timeslice of 10 seconds to save data periodically
      // This prevents data loss if browser crashes or disconnects
      mediaRecorder.start(10000);

      setRecording(true);
      setPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      // Save initial recording metadata for crash recovery
      if (recordingIdRef.current) {
        const metadata: RecordingMetadata = {
          id: recordingIdRef.current,
          startTime: Date.now(),
          duration: 0,
          language: "en",
          recordSystemAudio,
          paused: false,
          lastUpdate: Date.now(),
        };
        try {
          await saveRecordingMetadata(metadata);
        } catch (err) {
          // Silently handle metadata save error
        }

        // Set up periodic metadata updates (every 5 seconds) for recovery
        metadataUpdateTimerRef.current = setInterval(async () => {
          if (recordingIdRef.current) {
            try {
              await saveRecordingMetadata({
                id: recordingIdRef.current,
                startTime: metadata.startTime,
                duration: duration,
                language: metadata.language,
                recordSystemAudio,
                paused,
                lastUpdate: Date.now(),
              });
            } catch (err) {
              // Silently handle metadata update error
            }
          }
        }, 5000);
      }

      // Add visibility change listener to keep AudioContext alive
      const handleVisibilityChange = () => {
        if (!document.hidden && audioContext.state === "suspended") {
          audioContext.resume();
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      visibilityListenerRef.current = handleVisibilityChange;
    } catch (err) {
      setError("Microphone access denied or unavailable.");
      cleanup();
    }
  }, [cleanup, recordSystemAudio]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setPaused(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Clean up saved recording data since we stopped successfully
    if (recordingIdRef.current) {
      try {
        await deleteRecording(recordingIdRef.current);
      } catch (err) {
        // Silently handle deletion error
      }
      recordingIdRef.current = null;
    }
  }, []);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setPaused(false);
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setDuration((d) => d + 1);
        }, 1000);
      }
    }
  }, []);

  // Reset everything
  const resetRecording = useCallback(() => {
    cleanup();
    setRecording(false);
    setPaused(false);
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    chunksRef.current = [];
  }, [cleanup]);

  // Recover a saved recording from IndexedDB
  const recoverRecording = useCallback(
    async (metadata: RecordingMetadata): Promise<boolean> => {
      try {
        const savedChunks = await getRecordingChunks(metadata.id);
        if (savedChunks.length === 0) {
          return false;
        }

        // Restore state
        chunksRef.current = savedChunks;
        const blob = new Blob(savedChunks, { type: "audio/webm" });
        setAudioBlob(blob);
        setDuration(metadata.duration);
        setRecording(false);
        setPaused(false);

        return true;
      } catch (err) {
        return false;
      }
    },
    []
  );


  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    recording,
    paused,
    audioBlob,
    analyserNode,
    duration,
    error,
    systemAudioActive,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    recoverRecording,
  };
}
