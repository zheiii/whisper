"use client";

import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "./ui/button";
import { SignedIn, UserButton } from "@clerk/nextjs";
export function Header() {
  const router = useRouter();
  const handleLogin = () => {
    // Simulate login
    localStorage.setItem("whisper-authenticated", "true");
    router.push("/whispers");
  };
  const handleSignUp = () => {
    // Simulate signup
    localStorage.setItem("whisper-authenticated", "true");
    router.push("/whispers");
  };
  return (
    <header className="flex items-center justify-between p-6">
      <div className="flex items-center gap-2">
        <Mic className="w-6 h-6" />
        <span className="text-xl font-semibold">Whisper</span>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleLogin}>
          Login
        </Button>
        <Button onClick={handleSignUp}>Sign up</Button>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}
