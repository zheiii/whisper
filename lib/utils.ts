import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  formatDistanceToNow,
  differenceInHours,
  parseISO,
  isValid,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MAIN_LANGUAGES = [
  {
    value: "en-US",
    name: "English (US)",
  },
  {
    value: "en-GB",
    name: "English (UK)",
  },
  {
    value: "fr-FR",
    name: "French",
  },
  {
    value: "es-ES",
    name: "Spanish",
  },
  {
    value: "de-DE",
    name: "German",
  },
  {
    value: "it-IT",
    name: "Italian",
  },
  {
    value: "pt-BR",
    name: "Portuguese (Brazil)",
  },
  {
    value: "ja-JP",
    name: "Japanese",
  },
  {
    value: "ko-KR",
    name: "Korean",
  },
  {
    value: "zh-CN",
    name: "Chinese (Simplified)",
  },
];

/**
 * Formats a timestamp string according to the following rules:
 * - If less than 12 hours ago: "HH:mm - X hours ago"
 * - If 12 hours or more: "HH:mm - M/D/YYYY"
 * @param timestamp ISO string or Date
 * @returns formatted string
 */
export function formatWhisperTimestamp(timestamp: string | Date): string {
  let date: Date;
  if (typeof timestamp === "string") {
    date = parseISO(timestamp);
    if (!isValid(date)) {
      // fallback for non-ISO strings
      date = new Date(timestamp);
    }
  } else {
    date = timestamp;
  }
  const now = new Date();
  const hoursAgo = differenceInHours(now, date);
  const timePart = format(date, "HH:mm");
  if (hoursAgo < 12) {
    // e.g. "03:21 - 3 hours ago"
    return `${timePart} - ${formatDistanceToNow(date, {
      addSuffix: true,
    }).replace("about ", "")}`;
  } else {
    // e.g. "03:55 - 6/30/2025"
    return `${timePart} - ${format(date, "M/d/yyyy")}`;
  }
}
