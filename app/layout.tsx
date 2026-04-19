import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Science Platform",
  description: "A science-first community platform for learners, educators, and researchers."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
