import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Raleway } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Whisper App",
  description: "Capture Your Thoughts By Voice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use client-side navigation for login/signup
  // This must be a Client Component to use useRouter, so we can use a workaround:
  // Place a ClientHeader component below
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${raleway.variable} antialiased`}>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Header />
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
