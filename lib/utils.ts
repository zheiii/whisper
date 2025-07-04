import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
