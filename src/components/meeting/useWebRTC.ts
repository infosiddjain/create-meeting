// useWebRTC.ts
import { useEffect, useRef, useState } from "react";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useWebRTC(socketRef: any) {
  const peersRef = useRef<{ [userId: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<any[]>([]);

  const initLocalMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
    return stream;
  };

  const createPeer = (remoteUserId: string, isOfferer: boolean) => {
    const socket = socketRef.current;
    const peer = new RTCPeerConnection(ICE_CONFIG);

    peersRef.current[remoteUserId] = peer;

    const stream = localStreamRef.current;
    stream?.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: remoteUserId,
          from: socket.id,
          candidate: event.candidate,
        });
      }
    };

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams((prev) => {
        const exists = prev.find((p) => p.userId === remoteUserId);
        if (exists) {
          return prev.map((p) =>
            p.userId === remoteUserId ? { ...p, stream: remoteStream } : p
          );
        }
        return [...prev, { userId: remoteUserId, stream: remoteStream }];
      });
    };

    if (isOfferer) {
      setTimeout(async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socket.emit("offer", { to: remoteUserId, from: socket.id, sdp: offer });
      }, 300);
    }

    return peer;
  };

  return {
    peersRef,
    localStreamRef,
    localVideoRef,
    remoteStreams,
    initLocalMedia,
    createPeer,
    setRemoteStreams,
  };
}
