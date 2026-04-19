"use client";

import { useEffect, useMemo, useState } from "react";

type LiveKitRoomProps = {
  roomIdOrSlug: string;
  roomTitle: string;
  mediaMode: "audio" | "video";
};

type TokenResponse = {
  token: string;
  url: string;
  roomName: string;
  provider: string;
};

export function LiveKitRoomPanel({ roomIdOrSlug, roomTitle, mediaMode }: LiveKitRoomProps) {
  const [payload, setPayload] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadToken() {
      try {
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomIdOrSlug })
        });

        const data = (await response.json()) as TokenResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Unable to start the LiveKit room.");
        }

        if (active) {
          setPayload(data);
          setError("");
        }
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Unable to start the LiveKit room.");
        }
      }
    }

    void loadToken();

    return () => {
      active = false;
    };
  }, [roomIdOrSlug]);

  const joinHref = useMemo(() => {
    if (!payload || typeof window === "undefined") return "";
    const url = new URL("/api/livekit/token", window.location.origin);
    url.searchParams.set("room", roomIdOrSlug);
    return url.toString();
  }, [payload, roomIdOrSlug]);

  return (
    <div className="card stack">
      <div className="row">
        <span className="pill">LiveKit SFU</span>
        <span className="inline-badge">{mediaMode}</span>
        {payload?.roomName ? <span className="muted">Room {payload.roomName}</span> : null}
      </div>
      <div>
        <h3 style={{ marginTop: 0 }}>{roomTitle}</h3>
        <p className="muted">
          This room uses a production-style SFU path instead of browser mesh. Use the token endpoint below with web or mobile clients.
        </p>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      {payload ? (
        <div className="stack">
          <div className="card-list">
            <div className="row"><span className="inline-badge">Server URL</span><span>{payload.url}</span></div>
            <div className="row"><span className="inline-badge">Provider</span><span>{payload.provider}</span></div>
          </div>
          <details>
            <summary>Token payload ready</summary>
            <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>
{JSON.stringify({ roomName: payload.roomName, url: payload.url, token: `${payload.token.slice(0, 24)}...` }, null, 2)}
            </pre>
          </details>
          <div className="actions">
            <button className="button" type="button" onClick={() => setJoined((value) => !value)}>
              {joined ? "Hide starter instructions" : "Show starter instructions"}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(payload.token);
              }}
            >
              Copy token
            </button>
          </div>
          {joined ? (
            <div className="card stack">
              <h4 style={{ margin: 0 }}>Starter steps</h4>
              <ol style={{ margin: 0, paddingLeft: "1.1rem" }}>
                <li>Use the token and URL with the web LiveKit room component or the mobile LiveKit screen.</li>
                <li>Record the room from the recordings page or `/api/livekit/egress/start`.</li>
                <li>Deep-link attendees to this room with `science-platform://calls/{roomIdOrSlug}`.</li>
              </ol>
              <a className="button secondary" href={joinHref}>
                Open token endpoint
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="muted">Preparing room credentials…</div>
      )}
    </div>
  );
}
