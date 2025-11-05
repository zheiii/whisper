import { useCallback, useEffect, useRef, useState } from "react";

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
    setAnalyserNode(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    cleanup();
    setError(null);
    setDuration(0);
    chunksRef.current = [];

    try{
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

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
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

      // Start recording
      mediaRecorder.start();

      setRecording(true);
      setPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      setError("Microphone access denied or unavailable.");
      cleanup();
    }
  }, [cleanup, recordSystemAudio]);

  // Stop recording
  const stopRecording = useCallback(() => {
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
  };
}
