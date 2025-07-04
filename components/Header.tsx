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
  return (
    <header className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
      <Link href="/" className="flex items-center gap-2">
        <img src="/logo.svg" className="min-w-5 min-h-5 size-5" />
        <img
          src="/logoGradient.svg"
          alt="whisper"
          className="w-[71px] min-h-[25px] h-[25px]"
        />
      </Link>
      <div className="flex items-center gap-2">
        <SignedOut>
          <SignInButton>
            <Button variant="ghost">Login</Button>
          </SignInButton>
          <SignUpButton>
            <Button className="font-medium">Sign up</Button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <Button className="w-[51px] h-[30px] relative rounded-lg bg-white hover:bg-gray-50 border-[0.5px] border-gray-200">
            <img src="/spark.svg" className="size-4 min-w-4" />
            <p className="text-sm font-medium text-left text-[#1e2939]">12</p>
          </Button>
          <Button
            variant="ghost"
            className="p-[7px] size-[30px] min-w-[30px] min-h-[30px] rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            <img src="/key.svg" className="min-w-4 min-h-4 size-4" />
          </Button>
          <UserButton
            appearance={{
              elements: {
                avatarBox: {
                  img: "rounded-[8px]",
                },
              },
            }}
          />
        </SignedIn>
      </div>
    </header>
  );
}
