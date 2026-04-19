
import {
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  MediaStream
} from "react-native-webrtc";

type SignalHandler = (message: { recipientUserId?: string | null; signalType: string; payload: Record<string, unknown> }) => Promise<void>;

type RemotePeerState = {
  userId: string;
  connection: RTCPeerConnection;
  stream: MediaStream | null;
};

export type MobileCallController = {
  localStream: MediaStream | null;
  peers: Map<string, RemotePeerState>;
  initLocalMedia: (options?: { video?: boolean; audio?: boolean }) => Promise<MediaStream | null>;
  ensurePeer: (remoteUserId: string, iceServers: Array<Record<string, unknown>>, sendSignal: SignalHandler) => Promise<RTCPeerConnection>;
  createOfferFor: (remoteUserId: string, iceServers: Array<Record<string, unknown>>, sendSignal: SignalHandler) => Promise<void>;
  handleSignal: (message: { senderUserId: string; signalType: string; payload: Record<string, unknown> }, iceServers: Array<Record<string, unknown>>, sendSignal: SignalHandler) => Promise<void>;
  leave: () => void;
};

export function createMobileCallController(selfUserId: string): MobileCallController {
  let localStream: MediaStream | null = null;
  const peers = new Map<string, RemotePeerState>();

  async function initLocalMedia(options?: { video?: boolean; audio?: boolean }) {
    if (localStream) return localStream;
    localStream = await mediaDevices.getUserMedia({
      audio: options?.audio !== false,
      video: options?.video === false ? false : { frameRate: 24, facingMode: "user" }
    });
    return localStream;
  }

  async function ensurePeer(remoteUserId: string, iceServers: Array<Record<string, unknown>>, sendSignal: SignalHandler) {
    const existing = peers.get(remoteUserId);
    if (existing) return existing.connection;

    const connection = new RTCPeerConnection({ iceServers });
    const peerState: RemotePeerState = {
      userId: remoteUserId,
      connection,
      stream: null
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        connection.addTrack(track, localStream!);
      });
    }

    connection.onicecandidate = async (event) => {
      if (!event.candidate) return;
      await sendSignal({
        recipientUserId: remoteUserId,
        signalType: "ice-candidate",
        payload: event.candidate.toJSON()
      });
    };

    connection.ontrack = (event) => {
      peerState.stream = event.streams[0] ?? null;
    };

    peers.set(remoteUserId, peerState);
    return connection;
  }

  async function createOfferFor(remoteUserId: string, iceServers: Array<Record<string, unknown>>, sendSignal: SignalHandler) {
    const connection = await ensurePeer(remoteUserId, iceServers, sendSignal);
    const offer = await connection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await connection.setLocalDescription(offer);
    await sendSignal({
      recipientUserId: remoteUserId,
      signalType: "offer",
      payload: offer.toJSON()
    });
  }

  async function handleSignal(
    message: { senderUserId: string; signalType: string; payload: Record<string, unknown> },
    iceServers: Array<Record<string, unknown>>,
    sendSignal: SignalHandler
  ) {
    if (message.senderUserId === selfUserId) return;

    const connection = await ensurePeer(message.senderUserId, iceServers, sendSignal);

    if (message.signalType === "offer") {
      await connection.setRemoteDescription(new RTCSessionDescription(message.payload as any));
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      await sendSignal({
        recipientUserId: message.senderUserId,
        signalType: "answer",
        payload: answer.toJSON()
      });
      return;
    }

    if (message.signalType === "answer") {
      await connection.setRemoteDescription(new RTCSessionDescription(message.payload as any));
      return;
    }

    if (message.signalType === "ice-candidate") {
      await connection.addIceCandidate(new RTCIceCandidate(message.payload as any));
    }
  }

  function leave() {
    for (const peer of peers.values()) {
      peer.connection.close();
    }
    peers.clear();

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }
  }

  return {
    get localStream() {
      return localStream;
    },
    peers,
    initLocalMedia,
    ensurePeer,
    createOfferFor,
    handleSignal,
    leave
  };
}
