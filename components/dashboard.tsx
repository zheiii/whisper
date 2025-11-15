"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Search, Mic, Upload, Trash2, X } from "lucide-react";
import { RecordingModal } from "@/components/RecordingModal";
import type { Transcription } from "@/app/page";
import { UploadModal } from "./UploadModal";
import { formatWhisperTimestamp } from "@/lib/utils";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardProps {
  transcriptions: Transcription[];
}

export function Dashboard({ transcriptions }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [localTranscriptions, setLocalTranscriptions] =
    useState(transcriptions);
  const trpc = useTRPC();
  const deleteMutation = useMutation(
    trpc.whisper.deleteWhisper.mutationOptions()
  );

  // Desktop detection (simple window width check)
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const filteredTranscriptions = searchQuery
    ? localTranscriptions.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : localTranscriptions;

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Whisper?")) return;
    // Optimistically remove from UI
    setLocalTranscriptions((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteMutation.mutateAsync({ id });
    } catch (err) {
      // Rollback if error
      setLocalTranscriptions(transcriptions);
      alert(
        "Failed to delete. You may not own this Whisper or there was a network error."
      );
    }
  };

  const handleNewWhisper = () => {
    setShowRecordingModal(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.metaKey &&
        e.shiftKey &&
        (e.code === "Space" || e.key === " " || e.key === "Spacebar")
      ) {
        e.preventDefault();
        handleNewWhisper();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleUploadVoiceNote = () => {
    setShowUploadModal(true);
  };

  return (
    <>
      <div className="flex-1 h-full mx-auto w-full pb-24">
        <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-[#101828] mb-2">
              Your Whispers
            </h1>
            <p className="text-sm text-muted-foreground">
              {localTranscriptions.length} recording
              {localTranscriptions.length !== 1 ? "s" : ""}
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6"
          >
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Search whispers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-11 bg-background border-input transition-all focus-visible:ring-2 focus-visible:ring-ring/20"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Empty State */}
          {filteredTranscriptions.length === 0 && searchQuery === "" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-col items-center justify-center py-20 px-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-[#101828] mb-2">
                Welcome, whisperer!
              </h2>
              <p className="text-base text-center text-muted-foreground max-w-sm mb-8">
                Start by creating a new Whisper or upload a voice note for
                transcription
              </p>
            </motion.div>
          ) : filteredTranscriptions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-16 px-4"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-[#101828] mb-2">
                No results found
              </h3>
              <p className="text-sm text-center text-muted-foreground">
                Try adjusting your search query
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {filteredTranscriptions.map((transcription, index) => (
                  <motion.div
                    key={transcription.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.05,
                      ease: "easeOut",
                    }}
                    layout
                  >
                    <Card className="group relative overflow-hidden border border-border/40 hover:border-border hover:shadow-md transition-all duration-300">
                      <Link
                        href={`/whispers/${transcription.id}`}
                        className="block p-4 md:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Title */}
                            <h3 className="text-base font-semibold text-[#101828] line-clamp-1 group-hover:text-primary transition-colors">
                              {transcription.title}
                            </h3>

                            {/* Preview */}
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {transcription.preview}
                            </p>

                            {/* Timestamp Badge */}
                            <div className="flex items-center gap-2 pt-1">
                              <Badge
                                variant="secondary"
                                className="text-xs font-normal bg-muted/50 hover:bg-muted/70 transition-colors"
                              >
                                {formatWhisperTimestamp(transcription.timestamp)}
                              </Badge>
                            </div>
                          </div>

                          {/* Actions Menu (Desktop) */}
                          {isDesktop && (
                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="p-2 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                    aria-label="More actions"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDelete(transcription.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </Link>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Floating Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6"
        >
          <div className="mx-auto max-w-4xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleUploadVoiceNote}
                className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-background"
              >
                <Upload className="w-5 h-5" />
                Upload Voice Note
              </Button>
              <Button
                size="lg"
                onClick={handleNewWhisper}
                className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-[#101828] hover:bg-[#101828]/90"
              >
                <Mic className="w-5 h-5" />
                New Whisper
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recording Modal */}
      {showRecordingModal && (
        <RecordingModal onClose={() => setShowRecordingModal(false)} />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} />
      )}
    </>
  );
}
