"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function UploadModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (transcription: {
    title: string;
    content: string;
    preview: string;
    timestamp: string;
    duration?: string;
  }) => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[392px] !p-0 border border-gray-200 rounded-tl-xl rounded-tr-xl bg-white overflow-hidden gap-0"
      >
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Upload Voice Audio</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col justify-start items-start w-[392px] h-[347px] relative overflow-hidden rounded-2xl bg-white border border-gray-200">
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
      </DialogContent>
    </Dialog>
  );
}
