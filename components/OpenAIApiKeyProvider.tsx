"use client";

import React, { useEffect, useState, useContext, createContext } from "react";

// Context for OpenAI API Key
const OpenAIApiKeyContext = createContext<
  | {
      apiKey: string | undefined;
      setApiKey: (key: string | undefined) => void;
    }
  | undefined
>(undefined);

export function OpenAIApiKeyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [apiKey, setApiKeyState] = useState<string | undefined>(undefined);

  useEffect(() => {
    setApiKeyState(sessionStorage.getItem("openaiApiKey") || undefined);
  }, []);

  // Sync to sessionStorage and notify listeners
  const setApiKey = (key: string | undefined) => {
    setApiKeyState(key);
    if (key) {
      sessionStorage.setItem("openaiApiKey", key);
    } else {
      sessionStorage.removeItem("openaiApiKey");
    }
  };

  return (
    <OpenAIApiKeyContext.Provider value={{ apiKey, setApiKey }}>
      {children}
    </OpenAIApiKeyContext.Provider>
  );
}

export function useOpenAIApiKey() {
  const context = useContext(OpenAIApiKeyContext);
  if (!context) {
    throw new Error(
      "useOpenAIApiKey must be used within a OpenAIApiKeyProvider"
    );
  }
  return context;
}