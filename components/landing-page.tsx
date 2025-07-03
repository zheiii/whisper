"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";

export function LandingPage() {
  const router = useRouter();

  return (
    <>
      {/* Main Content */}
      <main className="container mx-auto px-6 py-16 text-center">
        <div className="flex flex-col items-center">
          <p className="w-[225px] h-[30px] relative rounded-[100px] bg-gradient-to-r from-neutral-100 to-white border border-gray-200 flex items-center justify-center gap-1">
            <span className="text-sm text-left text-[#4a5565]">
              Made & powered by{" "}
            </span>
            <img
              src="/togetherai.svg"
              className="min-w-[70px] min-h-[11px] mt-0.5"
            />
          </p>

          <h1 className="text-[40px] md:text-7xl font-medium text-center text-[#101828] mb-6 leading-tight">
            Capture Your
            <br />
            Thoughts By Voice
          </h1>

          <p className="text-base text-center text-[#4a5565] max-w-[323px] mx-auto mb-8">
            Transform your voice into organized text and insights. Our AI
            transcribes your speech instantly and cleans it up!
          </p>

          <SignInButton>
            <Button
              size="lg"
              className="bg-slate-900 hover:bg-slate-800 text-base text-center text-white px-2 py-4 flex flex-row items-center justify-center gap-2"
            >
              <img src="/microphone.svg" className="size-5 min-w-5" />
              Start Note-Taking
            </Button>
          </SignInButton>

          <p className="text-sm text-center text-[#6a7282] mt-2">
            Free &amp; open source
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mx-auto justify-center mt-16 md:mt-9">
          <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white text-xs">
            In
          </div>
          <span>
            Press a button and{" "}
            <span className="font-medium">start transcribing</span>
          </span>
        </div>
      </main>
    </>
  );
}
