"use client";

import React, { useEffect, useState, useContext, createContext } from "react";

// Context for API Keys (OpenRouter and Whisper)
const ApiKeysContext = createContext<
  | {
      openrouterKey: string | undefined;
      whisperKey: string | undefined;
      setOpenrouterKey: (key: string | undefined) => void;
      setWhisperKey: (key: string | undefined) => void;
    }
  | undefined
>(undefined);

export function ApiKeysProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [openrouterKey, setOpenrouterKeyState] = useState<string | undefined>(
    undefined
  );
  const [whisperKey, setWhisperKeyState] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    setOpenrouterKeyState(
      sessionStorage.getItem("openrouterApiKey") || undefined
    );
    setWhisperKeyState(sessionStorage.getItem("whisperApiKey") || undefined);
  }, []);

  // Sync OpenRouter key to sessionStorage
  const setOpenrouterKey = (key: string | undefined) => {
    setOpenrouterKeyState(key);
    if (key) {
      sessionStorage.setItem("openrouterApiKey", key);
    } else {
      sessionStorage.removeItem("openrouterApiKey");
    }
  };

  // Sync Whisper key to sessionStorage
  const setWhisperKey = (key: string | undefined) => {
    setWhisperKeyState(key);
    if (key) {
      sessionStorage.setItem("whisperApiKey", key);
    } else {
      sessionStorage.removeItem("whisperApiKey");
    }
  };

  return (
    <ApiKeysContext.Provider
      value={{ openrouterKey, whisperKey, setOpenrouterKey, setWhisperKey }}
    >
      {children}
    </ApiKeysContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeysContext);
  if (!context) {
    throw new Error("useApiKeys must be used within an ApiKeysProvider");
  }
  return context;
}
