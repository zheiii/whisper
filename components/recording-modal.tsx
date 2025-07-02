"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Mic, Square } from "lucide-react"

interface RecordingModalProps {
  onClose: () => void
  onSave: (transcription: {
    title: string
    content: string
    preview: string
    timestamp: string
    duration?: string
  }) => void
  title?: string
}

// Extend the Window interface
declare global {
  interface Window {
    currentMediaRecorder: MediaRecorder | undefined
    currentStream: MediaStream | undefined
  }
}

export function RecordingModal({ onClose, onSave, title = "New Whisper" }: RecordingModalProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [noteType, setNoteType] = useState("quick-note")
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    // Cleanup function to stop recording if modal is closed
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Stop recording if modal is closed while recording
      if (window.currentMediaRecorder && window.currentMediaRecorder.state !== "inactive") {
        window.currentMediaRecorder.stop()
      }

      if (window.currentStream) {
        window.currentStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleStartRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setIsRecording(true)
      setRecordingTime(0)
      setHasRecording(false)

      // Store the stream so we can stop it later
      const mediaRecorder = new MediaRecorder(stream)

      // Store recorder in a ref or state if needed for stopping
      window.currentMediaRecorder = mediaRecorder
      window.currentStream = stream

      mediaRecorder.start()
    } catch (error) {
      console.error("Microphone access error:", error)
      alert("Microphone access is required to record audio.")
    }
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    setHasRecording(true)

    // Stop the media recorder and stream
    if (window.currentMediaRecorder && window.currentMediaRecorder.state !== "inactive") {
      window.currentMediaRecorder.stop()
    }

    if (window.currentStream) {
      window.currentStream.getTracks().forEach((track) => track.stop())
    }
  }

  const handleSaveRecording = () => {
    setIsProcessing(true)

    // Simulate transcription processing
    setTimeout(() => {
      const sampleTranscriptions = [
        "I had a great meeting today with the team. We discussed the new project timeline and everyone seems excited about the upcoming features. Need to follow up with Sarah about the design mockups.",
        "Reminder to pick up groceries on the way home. Need milk, bread, eggs, and don't forget the cat food. Also need to call mom about dinner plans for Sunday.",
        "Just finished reading an interesting article about artificial intelligence and its impact on productivity. The key takeaway is that AI tools can help us focus on more creative tasks while handling routine work.",
        "Meeting notes from today's standup: John is working on the authentication system, Lisa is finishing up the dashboard components, and I need to review the API documentation before tomorrow's client call.",
      ]

      const randomTranscription = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)]
      const preview =
        randomTranscription.length > 100 ? randomTranscription.substring(0, 100) + "..." : randomTranscription

      onSave({
        title: `${noteType === "quick-note" ? "Quick Note" : "Voice Memo"} - ${new Date().toLocaleDateString()}`,
        content: randomTranscription,
        preview,
        timestamp: new Date().toLocaleDateString(),
        duration: formatTime(recordingTime),
      })

      setIsProcessing(false)
      onClose()
    }, 2000)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recording Interface */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Button
                size="lg"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`w-20 h-20 rounded-full transition-all duration-200 ${
                  isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-slate-900 hover:bg-slate-800"
                }`}
                disabled={isProcessing}
              >
                {isRecording ? <Square className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
              </Button>

              {isRecording && (
                <div className="absolute -inset-2 border-2 border-red-500 rounded-full animate-pulse"></div>
              )}
            </div>

            <div className="text-center">
              <div className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</div>
              <div className="text-sm text-muted-foreground">
                {isRecording ? "Recording..." : hasRecording ? "Recording complete" : "Tap to start recording"}
              </div>
            </div>
          </div>

          {/* Note Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">What are you creating? (OPTIONAL)</label>
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger>
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

          {/* Daily Minutes Info */}
          <div className="text-sm text-muted-foreground">
            Daily minutes: <span className="font-mono">12:34</span> min left
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSaveRecording} disabled={!hasRecording || isProcessing} className="flex-1">
              {isProcessing ? "Processing..." : "Save Transcription"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
