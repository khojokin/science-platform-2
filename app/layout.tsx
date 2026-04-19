import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css";
import { isClerkConfigured } from "@/lib/auth-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Science Platform",
  description: "A science-first community platform for learners, educators, and researchers."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (!isClerkConfigured) {
    return content;
  }

  return (
    <ClerkProvider>
      {content}
    </ClerkProvider>
  );
}
