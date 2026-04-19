
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useBrowserSupabaseClient } from "@/lib/browser-supabase";

type PresenceState = {
  handle?: string;
  focus?: string;
  updatedAt?: string;
};

export function PresenceRoom({ topic, label }: { topic: string; label: string }) {
  const supabase = useBrowserSupabaseClient();
  const { user } = useUser();
  const [participants, setParticipants] = useState<Array<{ key: string; state: PresenceState }>>([]);
  const [focus, setFocus] = useState("reviewing notes");
  const [broadcasts, setBroadcasts] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const handle = useMemo(
    () => user?.username || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "scientist",
    [user]
  );

  useEffect(() => {
    const channel = supabase.channel(topic, {
      config: {
        broadcast: { self: true },
        presence: { key: user?.id || Math.random().toString(36).slice(2) }
      }
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const next = Object.entries(state).flatMap(([key, values]) => values.map((value) => ({ key, state: value })));
        setParticipants(next);
      })
      .on("broadcast", { event: "note" }, (payload) => {
        const text = String(payload.payload?.text ?? "");
        if (!text) return;
        setBroadcasts((current) => [text, ...current].slice(0, 8));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            handle,
            focus,
            updatedAt: new Date().toISOString()
          });
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [handle, supabase, topic, user?.id]);

  async function syncFocus(nextFocus: string) {
    setFocus(nextFocus);

    if (!channelRef.current) return;

    await channelRef.current.track({
      handle,
      focus: nextFocus,
      updatedAt: new Date().toISOString()
    });

    await channelRef.current.send({
      type: "broadcast",
      event: "note",
      payload: { text: `${handle} is ${nextFocus}` }
    });
  }

  return (
    <section className="card stack">
      <div className="row">
        <h3 style={{ margin: 0 }}>{label}</h3>
        <span className="inline-badge">{participants.length} active</span>
      </div>

      <label className="stack">
        <span className="muted">Your current focus</span>
        <input
          value={focus}
          onChange={(event) => setFocus(event.target.value)}
          onBlur={(event) => void syncFocus(event.target.value)}
        />
      </label>

      <div className="grid two">
        <div className="card-list">
          {participants.map((participant) => (
            <div className="row" key={participant.key}>
              <span className="inline-badge success">{participant.state.handle || participant.key}</span>
              <span className="muted">{participant.state.focus || "active"}</span>
            </div>
          ))}
        </div>

        <div className="card-list">
          {broadcasts.length === 0 ? (
            <div className="empty-state">Presence broadcasts will appear here as collaborators update their focus.</div>
          ) : (
            broadcasts.map((item, index) => (
              <div className="card" key={`${item}-${index}`}>
                {item}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
