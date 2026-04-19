"use client";

import { useEffect, useRef, useState } from "react";

type ZoomMeetingEmbedProps = {
  meetingNumber: string;
  password?: string | null;
  displayName: string;
};

export function ZoomMeetingEmbed({ meetingNumber, password, displayName }: ZoomMeetingEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let client: any;
    let cancelled = false;

    async function join() {
      try {
        setState("loading");

        const signatureResponse = await fetch("/api/zoom/meeting-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingNumber, role: 0 })
        });

        if (!signatureResponse.ok) {
          throw new Error(await signatureResponse.text());
        }

        const { signature, sdkKey } = (await signatureResponse.json()) as { signature: string; sdkKey: string };
        const module = await import("@zoom/meetingsdk/embedded");
        const ZoomMtgEmbedded = module.default;

        client = ZoomMtgEmbedded.createClient();

        if (cancelled || !containerRef.current) {
          return;
        }

        await client.init({
          zoomAppRoot: containerRef.current,
          language: "en-US"
        });

        await client.join({
          sdkKey,
          signature,
          meetingNumber,
          password: password ?? "",
          userName: displayName
        });

        setState("ready");
      } catch (cause) {
        console.error(cause);
        setState("error");
        setError(cause instanceof Error ? cause.message : "Failed to start Zoom Meeting SDK.");
      }
    }

    void join();

    return () => {
      cancelled = true;
      try {
        client?.leaveMeeting?.();
      } catch (cause) {
        console.error(cause);
      }
    };
  }, [displayName, meetingNumber, password]);

  return (
    <div className="stack">
      <div className="row">
        <span className={`inline-badge ${state === "ready" ? "success" : state === "error" ? "warning" : ""}`}>
          {state === "ready" ? "Zoom Meeting joined" : state === "error" ? "Error" : "Joining Zoom Meeting"}
        </span>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      <div ref={containerRef} className="zoom-container" />
    </div>
  );
}
