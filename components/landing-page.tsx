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
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-4">
            Made & powered by <span className="font-semibold">together.ai</span>
          </p>

          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Capture Your
            <br />
            Thoughts By Voice
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-md mx-auto">
            Transform your voice into organized text and insights. Our AI
            transcribes your speech instantly and cleans it up!
          </p>

          <SignInButton>
            <Button
              size="lg"
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3"
            >
              <Mic className="w-4 h-4 mr-2" />
              Start Note-Taking
            </Button>
          </SignInButton>

          <p className="text-sm text-muted-foreground mt-4">
            Free & open source
          </p>
        </div>

        {/* Demo Section */}
        <div className="max-w-md mx-auto mt-16">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
              <div className="flex-1 h-8 bg-slate-100 rounded flex items-center px-3">
                <div className="w-full h-1 bg-slate-300 rounded">
                  <div className="w-3/4 h-full bg-slate-600 rounded"></div>
                </div>
              </div>
            </div>

            <div className="text-left text-sm leading-relaxed">
              <span className="text-muted-foreground">"</span>
              <span className="text-muted-foreground">Okay, </span>
              <span className="font-medium">reminder: rab</span>
              <span className="text-muted-foreground">oat milk, </span>
              <span className="text-muted-foreground">no </span>
              <span className="font-medium">almond milk after work</span>
              <span className="text-muted-foreground">oh, </span>
              <span className="font-medium">
                and schedule dentist appointment
              </span>
              <span className="text-muted-foreground"> before I forget</span>
              <span className="text-muted-foreground">"</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white text-xs">
              In
            </div>
            <span>
              Press a button and{" "}
              <span className="font-medium">start transcribing</span>
            </span>
          </div>
        </div>
      </main>
    </>
  );
}
