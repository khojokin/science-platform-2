"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBrowserSupabaseClient } from "@/lib/browser-supabase";

type LiveCallRoomProps = {
  roomId: string;
  roomSlug: string;
  userId: string;
  displayName: string;
  mediaMode: "audio" | "video";
};

type PeerState = {
  id: string;
  stream: MediaStream | null;
  label: string;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

export function LiveCallRoom({ roomId, roomSlug, userId, displayName, mediaMode }: LiveCallRoomProps) {
  const supabase = useBrowserSupabaseClient();
  const channelRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());

  const [peers, setPeers] = useState<PeerState[]>([]);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(mediaMode === "video");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string>("");

  const channelName = useMemo(() => `call-room:${roomId}`, [roomId]);

  function syncPeers() {
    setPeers(
      Array.from(remoteStreamsRef.current.entries()).map(([id, stream]) => ({
        id,
        stream,
        label: id
      }))
    );
  }

  async function sendSignal(payload: Record<string, unknown>) {
    await channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload
    });
  }

  function getOrCreatePeerConnection(peerId: string) {
    const existing = peerConnectionsRef.current.get(peerId);
    if (existing) return existing;

    const connection = new RTCPeerConnection(rtcConfig);
    const localStream = localStreamRef.current;

    if (localStream) {
      for (const track of localStream.getTracks()) {
        connection.addTrack(track, localStream);
      }
    }

    connection.onicecandidate = async (event) => {
      if (!event.candidate) return;
      await sendSignal({
        type: "ice",
        from: userId,
        to: peerId,
        candidate: event.candidate.toJSON()
      });
    };

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      remoteStreamsRef.current.set(peerId, stream);
      syncPeers();
    };

    connection.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(connection.connectionState)) {
        remoteStreamsRef.current.delete(peerId);
        peerConnectionsRef.current.delete(peerId);
        syncPeers();
      }
    };

    peerConnectionsRef.current.set(peerId, connection);
    return connection;
  }

  async function createOfferForPeer(peerId: string) {
    const connection = getOrCreatePeerConnection(peerId);
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    await sendSignal({
      type: "offer",
      from: userId,
      to: peerId,
      description: offer
    });
  }

  async function ensureLocalStream() {
    if (localStreamRef.current) return localStreamRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mediaMode === "video"
    });

    localStreamRef.current = stream;
    setMuted(!stream.getAudioTracks().some((track) => track.enabled));
    setCameraEnabled(stream.getVideoTracks().every((track) => track.enabled));

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  }

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const stream = await ensureLocalStream();
        if (!active) return;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const channel = supabase.channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: userId }
          }
        });

        channelRef.current = channel;

        channel
          .on("presence", { event: "sync" }, async () => {
            const state = channel.presenceState<Record<string, { userId: string; name: string }>[]>(); 
            const peerIds = Object.keys(state).filter((peerId) => peerId !== userId);

            for (const peerId of peerIds) {
              if (!peerConnectionsRef.current.has(peerId) && userId < peerId) {
                await createOfferForPeer(peerId);
              }
            }
          })
          .on("broadcast", { event: "signal" }, async ({ payload }: { payload: any }) => {
            if (!payload || payload.to !== userId) return;

            if (payload.type === "offer") {
              const connection = getOrCreatePeerConnection(payload.from);
              await connection.setRemoteDescription(payload.description);
              const answer = await connection.createAnswer();
              await connection.setLocalDescription(answer);
              await sendSignal({
                type: "answer",
                from: userId,
                to: payload.from,
                description: answer
              });
            }

            if (payload.type === "answer") {
              const connection = getOrCreatePeerConnection(payload.from);
              await connection.setRemoteDescription(payload.description);
            }

            if (payload.type === "ice" && payload.candidate) {
              const connection = getOrCreatePeerConnection(payload.from);
              await connection.addIceCandidate(payload.candidate);
            }
          });

        await channel.subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              userId,
              name: displayName,
              roomSlug,
              joinedAt: new Date().toISOString()
            });
            setJoined(true);
          }
        });
      } catch (cause) {
        console.error(cause);
        setError(cause instanceof Error ? cause.message : "Failed to start camera or microphone.");
      }
    }

    void boot();

    return () => {
      active = false;
      setJoined(false);
      channelRef.current?.unsubscribe();

      for (const connection of peerConnectionsRef.current.values()) {
        connection.close();
      }
      peerConnectionsRef.current.clear();

      for (const track of localStreamRef.current?.getTracks() ?? []) {
        track.stop();
      }

      localStreamRef.current = null;
      remoteStreamsRef.current.clear();
      syncPeers();
    };
  }, [channelName, displayName, mediaMode, roomSlug, supabase, userId]);

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;

    const next = !muted;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !next;
    }
    setMuted(next);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    if (!stream) return;

    const next = !cameraEnabled;
    for (const track of stream.getVideoTracks()) {
      track.enabled = next;
    }
    setCameraEnabled(next);
  }

  return (
    <div className="stack">
      <div className="row">
        <span className={`inline-badge ${joined ? "success" : "warning"}`}>{joined ? "Connected" : "Connecting"}</span>
        <span className="muted">Native mesh mode is best for small rooms.</span>
        {error ? <span className="inline-badge warning">{error}</span> : null}
      </div>

      <div className="grid two">
        <div className="card stack">
          <strong>Your stream</strong>
          <video ref={localVideoRef} className="call-video" autoPlay muted playsInline />
          <div className="row">
            <button type="button" className="secondary" onClick={toggleMute}>
              {muted ? "Unmute" : "Mute"}
            </button>
            {mediaMode === "video" ? (
              <button type="button" className="secondary" onClick={toggleCamera}>
                {cameraEnabled ? "Camera off" : "Camera on"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="card stack">
          <strong>Remote peers</strong>
          {peers.length === 0 ? (
            <div className="empty-state">Waiting for other members to join this room.</div>
          ) : (
            peers.map((peer) => <RemotePeer key={peer.id} peer={peer} />)
          )}
        </div>
      </div>
    </div>
  );
}

function RemotePeer({ peer }: { peer: PeerState }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (ref.current && peer.stream) {
      ref.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="stack">
      <span className="muted">{peer.label}</span>
      <video ref={ref} className="call-video" autoPlay playsInline />
    </div>
  );
}
