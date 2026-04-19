"use client";

import { useEffect, useRef, useState } from "react";

type ZoomVideoRoomProps = {
  title: string;
  sessionName: string;
  sessionPassword?: string | null;
  displayName: string;
};

export function ZoomVideoRoom({ title, sessionName, sessionPassword, displayName }: ZoomVideoRoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let toolkit: any;

    async function join() {
      try {
        setState("loading");

        const response = await fetch("/api/zoom/video-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionName,
            roleType: 0
          })
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as { token: string };
        const module = await import("@zoom/videosdk-ui-toolkit");
        toolkit = module.default;

        if (cancelled || !containerRef.current) {
          return;
        }

        toolkit.joinSession(containerRef.current, {
          videoSDKJWT: payload.token,
          sessionName,
          sessionPasscode: sessionPassword ?? "",
          userName: displayName,
          features: ["preview", "video", "audio", "share", "chat", "users", "settings", "leave", "footer", "header"]
        });

        toolkit.onSessionClosed(() => {
          toolkit.destroy?.();
        });

        setState("ready");
      } catch (cause) {
        console.error(cause);
        setState("error");
        setError(cause instanceof Error ? cause.message : "Failed to start Zoom Video SDK.");
      }
    }

    void join();

    return () => {
      cancelled = true;
      try {
        toolkit?.closeSession?.(containerRef.current);
        toolkit?.destroy?.();
      } catch (cause) {
        console.error(cause);
      }
    };
  }, [displayName, sessionName, sessionPassword]);

  return (
    <div className="stack">
      <div className="row">
        <span className={`inline-badge ${state === "ready" ? "success" : state === "error" ? "warning" : ""}`}>
          {state === "ready" ? "Zoom Video live" : state === "error" ? "Error" : "Starting Zoom Video"}
        </span>
        <span className="muted">{title}</span>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      <div ref={containerRef} className="zoom-container" />
    </div>
  );
}
