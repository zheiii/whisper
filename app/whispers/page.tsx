"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dashboard } from "@/components/dashboard"

export interface Transcription {
  id: string
  title: string
  content: string
  preview: string
  timestamp: string
  duration?: string
}

export default function WhispersPage() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const router = useRouter()

  // Load transcriptions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("whisper-transcriptions")
    if (saved) {
      setTranscriptions(JSON.parse(saved))
    }
  }, [])

  // Save transcriptions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("whisper-transcriptions", JSON.stringify(transcriptions))
  }, [transcriptions])

  const handleAddTranscription = (transcription: Omit<Transcription, "id">) => {
    const newTranscription: Transcription = {
      ...transcription,
      id: Date.now().toString(),
    }
    setTranscriptions((prev) => [newTranscription, ...prev])
  }

  const handleSelectTranscription = (transcription: Transcription) => {
    router.push(`/whispers/${transcription.id}`)
  }

  return (
    <Dashboard
      transcriptions={transcriptions}
      onAddTranscription={handleAddTranscription}
      onSelectTranscription={handleSelectTranscription}
    />
  )
}
