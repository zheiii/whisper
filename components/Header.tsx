"use client";

import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "./ui/button";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
export function Header() {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
      <Link href="/" className="flex items-center gap-2">
        <Mic className="w-6 h-6" />
        <span className="text-xl font-semibold">Whisper</span>
      </Link>
      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton>
            <Button variant="ghost">Login</Button>
          </SignInButton>
          <SignUpButton>
            <Button className="font-medium">Sign up</Button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}
