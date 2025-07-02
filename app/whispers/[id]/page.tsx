"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { TranscriptionView } from "@/components/transcription-view"
import type { Transcription } from "../page"

export default function TranscriptionPage() {
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  useEffect(() => {
    const saved = localStorage.getItem("whisper-transcriptions")
    if (saved) {
      const allTranscriptions = JSON.parse(saved)
      setTranscriptions(allTranscriptions)
      const found = allTranscriptions.find((t: Transcription) => t.id === id)
      setTranscription(found || null)
    }
  }, [id])

  const handleUpdateTranscription = (updatedTranscription: Transcription) => {
    const updatedTranscriptions = transcriptions.map((t) =>
      t.id === updatedTranscription.id ? updatedTranscription : t,
    )
    setTranscriptions(updatedTranscriptions)
    setTranscription(updatedTranscription)
    localStorage.setItem("whisper-transcriptions", JSON.stringify(updatedTranscriptions))
  }

  const handleDeleteTranscription = (id: string) => {
    const updatedTranscriptions = transcriptions.filter((t) => t.id !== id)
    setTranscriptions(updatedTranscriptions)
    localStorage.setItem("whisper-transcriptions", JSON.stringify(updatedTranscriptions))
    router.push("/whispers")
  }

  const handleBackToDashboard = () => {
    router.push("/whispers")
  }

  if (!transcription) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Transcription not found</h1>
          <p className="text-muted-foreground mb-4">The transcription you're looking for doesn't exist.</p>
          <button onClick={() => router.push("/whispers")} className="text-blue-600 hover:text-blue-800 underline">
            Back to Whispers
          </button>
        </div>
      </div>
    )
  }

  return (
    <TranscriptionView
      transcription={transcription}
      onUpdate={handleUpdateTranscription}
      onDelete={handleDeleteTranscription}
      onBack={handleBackToDashboard}
    />
  )
}
