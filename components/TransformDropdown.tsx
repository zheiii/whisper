import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { RecordingTypes } from "@/components/RecordingBasics";

export function TransformDropdown({
  onTransform,
}: {
  onTransform: (type: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full md:max-w-[322px] max-w-md bg-slate-900 text-white py-2 rounded-lg font-semibold text-base flex items-center justify-center gap-2 cursor-pointer">
          <img src="/sparkFull.svg" className="size-5 min-w-5 min-h-5" />
          <span>Transform</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="!p-0">
        {RecordingTypes.map((type) => (
          <DropdownMenuItem
            key={type.value}
            onSelect={() => onTransform(type.value)}
            className="flex items-center gap-2 cursor-pointer h-[51px] p-3 border-b border-slate-200 hover:bg-slate-50 min-w-[322px] max-w-full"
          >
            <img
              src={`/recordings/${type.value}.svg`}
              className="size-[18px] min-w-[18px]"
            />
            <span>{type.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
