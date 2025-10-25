"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";
import { useApiKeys } from "../ApiKeysProvider";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { RecordingMinutesLeft } from "../RecordingMinutesLeft";

export const ModalCustomApiKey = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isOpen = searchParams.get("customKey") === "true";

  const { openrouterKey, whisperKey, setOpenrouterKey, setWhisperKey } = useApiKeys();
  const [openrouterInput, setOpenrouterInput] = useState("");
  const [whisperInput, setWhisperInput] = useState("");
  const [isValidatingOpenRouter, setIsValidatingOpenRouter] = useState(false);
  const [isValidatingWhisper, setIsValidatingWhisper] = useState(false);
  const debounceTimeoutOpenRouterRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutWhisperRef = useRef<NodeJS.Timeout | null>(null);
  const trpc = useTRPC();
  const isBYOK = !!whisperKey;

  const { data: minutesData, isLoading: isMinutesLoading } = useQuery(
    trpc.limit.getMinutesLeft.queryOptions()
  );

  useEffect(() => {
    setOpenrouterInput(openrouterKey || "");
    setWhisperInput(whisperKey || "");
  }, [openrouterKey, whisperKey]);

  // Remove customKey from the URL
  const handleClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("customKey");
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.push(newUrl);
  }, [router, pathname, searchParams]);

  const validateAndSaveApiKey = async (apiKey: string, provider: "openrouter" | "whisper") => {
    const setValidating = provider === "openrouter" ? setIsValidatingOpenRouter : setIsValidatingWhisper;
    const setKey = provider === "openrouter" ? setOpenrouterKey : setWhisperKey;
    const setInput = provider === "openrouter" ? setOpenrouterInput : setWhisperInput;
    const providerName = provider === "openrouter" ? "OpenRouter" : "Lemonfox Whisper";

    setValidating(true);
    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey, provider }),
      });

      if (response.ok) {
        setKey(apiKey);
        toast.success(`${providerName} API key validated and saved!`);
        return true;
      } else {
        const errorData = await response.json();
        const errorMessage =
          errorData.message ||
          `API key validation failed with status: ${response.status}`;
        toast.error(`${providerName}: ${errorMessage}`);

        if (errorMessage.includes("Invalid") || errorMessage.includes("invalid")) {
          setKey("");
          setInput("");
        }
        return false;
      }
    } finally {
      setValidating(false);
    }
  };

  const handleOpenRouterKeyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOpenrouterInput(value);

    if (value.length === 0) {
      setOpenrouterKey("");
      return;
    }

    if (debounceTimeoutOpenRouterRef.current) {
      clearTimeout(debounceTimeoutOpenRouterRef.current);
    }

    debounceTimeoutOpenRouterRef.current = setTimeout(async () => {
      await validateAndSaveApiKey(value, "openrouter");
    }, 500);
  };

  const handleWhisperKeyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWhisperInput(value);

    if (value.length === 0) {
      setWhisperKey("");
      return;
    }

    if (debounceTimeoutWhisperRef.current) {
      clearTimeout(debounceTimeoutWhisperRef.current);
    }

    debounceTimeoutWhisperRef.current = setTimeout(async () => {
      await validateAndSaveApiKey(value, "whisper");
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-[392px] w-full p-0 border border-gray-200 rounded-2xl bg-white flex flex-col items-center justify-center gap-0"
        showCloseButton={false}
      >
        <DialogHeader className="w-full flex flex-col items-center p-0">
          <div className="flex items-center justify-start w-full p-5 relative border-b border-gray-200">
            <img
              src="/square-logo.png"
              alt="Logo"
              className="w-5 h-5 rounded-[3px] mr-2"
            />
            <DialogTitle className="text-base font-semibold text-[#101828]">
              API Keys
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex flex-col items-center w-full px-5 py-6 gap-4">
          {/* Lemonfox Whisper API Key Section */}
          <div className="w-full flex flex-col gap-2 relative">
            <p className="text-base font-medium text-[#101828] text-left">
              Lemonfox Whisper API key (for transcription):
            </p>
            <div className="relative w-full">
              <input
                type="password"
                className="w-full h-9 flex items-center overflow-hidden rounded-lg bg-white border border-[#99a1af] px-3 text-base placeholder:text-[#99a1af] text-[#4a5565] pr-10"
                placeholder="Lemonfox API Key"
                value={whisperInput}
                onChange={handleWhisperKeyChange}
                autoComplete="off"
              />
              {isValidatingWhisper && (
                <img
                  src="/loading.svg"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                  alt="Validating API key..."
                  aria-busy="true"
                />
              )}
            </div>
            <p className="text-sm text-[#4a5565] text-left">
              Get your key at{" "}
              <a
                href="https://lemonfox.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#101828] underline"
              >
                lemonfox.ai
              </a>
            </p>
          </div>

          {/* OpenRouter API Key Section */}
          <div className="w-full flex flex-col gap-2 relative">
            <p className="text-base font-medium text-[#101828] text-left">
              OpenRouter API key (for transformations):
            </p>
            <div className="relative w-full">
              <input
                type="password"
                className="w-full h-9 flex items-center overflow-hidden rounded-lg bg-white border border-[#99a1af] px-3 text-base placeholder:text-[#99a1af] text-[#4a5565] pr-10"
                placeholder="OpenRouter API Key"
                value={openrouterInput}
                onChange={handleOpenRouterKeyChange}
                autoComplete="off"
              />
              {isValidatingOpenRouter && (
                <img
                  src="/loading.svg"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                  alt="Validating API key..."
                  aria-busy="true"
                />
              )}
            </div>
            <p className="text-sm text-[#4a5565] text-left">
              Get your key at{" "}
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#101828] underline"
              >
                openrouter.ai
              </a>
            </p>
          </div>

          <div className="w-full flex flex-col gap-3 mt-2">
            <button
              className="flex justify-center items-center w-full h-10 gap-2 px-[33px] py-2.5 rounded-lg border border-[#d1d5dc] cursor-pointer"
              type="button"
              onClick={handleClose}
            >
              <span className="text-base font-medium text-[#364153]">
                Dismiss
              </span>
            </button>
          </div>
        </div>
        <div className="w-full flex justify-start px-5 py-3 mt-auto border-t border-gray-200">
          {isMinutesLoading ? (
            <span className="text-sm text-[#4a5565]">Loading...</span>
          ) : (
            <RecordingMinutesLeft
              minutesLeft={isBYOK ? Infinity : minutesData?.remaining ?? 0}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
