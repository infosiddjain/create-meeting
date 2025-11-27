"use client";

import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

type RemoteStream = {
  userId: string;
  stream: MediaStream;
};

type MeetingUser = {
  userId: string;
  name: string;
  joinedAt: string;
  leftAt?: string;
};

type MeetingData = {
  roomId: string;
  users: MeetingUser[];
};

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function MeetingPageClient({ id }: { id: string }) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [connecting, setConnecting] = useState(true);

  const socketRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [userId: string]: RTCPeerConnection }>({});
  const nameRef = useRef<string>("User-" + Math.floor(Math.random() * 1000));

  const fetchMeetingDetails = async () => {
    try {
      const res = await fetch(
        `https://node-meeting.onrender.com/meeting/${id}`
      );
      const data = await res.json();
      setMeetingData(data);
    } catch (err) {
      console.log("Failed to load meeting data");
    }
  };

  useEffect(() => {
    fetchMeetingDetails();

    const interval = setInterval(fetchMeetingDetails, 5000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const socket = io("https://node-meeting.onrender.com", {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    let isMounted = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        socket.emit("join-room", { roomId: id, name: nameRef.current });
        setConnecting(false);
      } catch (err) {
        console.error("getUserMedia error:", err);
        setConnecting(false);
      }
    };

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      start();
      fetchMeetingDetails();
    });

    socket.on("user-joined", () => {
      fetchMeetingDetails();
    });

    socket.on("user-left", () => {
      fetchMeetingDetails();
    });

    socket.on("existing-users", (users: string[]) => {
      console.log("Existing users in room:", users);
    });

    socket.on("user-joined", ({ userId }) => {
      if (!localStreamRef.current) return;
      createPeerConnection(userId, true);
    });

    socket.on("offer", async ({ from, sdp }) => {
      if (!localStreamRef.current) return;
      const peer = createPeerConnection(from, false);
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", {
        to: from,
        from: socket.id,
        sdp: answer,
      });
    });

    socket.on("answer", async ({ from, sdp }) => {
      const peer = peersRef.current[from];
      if (!peer) return;
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      const peer = peersRef.current[from];
      if (!peer) return;

      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    });

    socket.on("user-left", ({ userId }) => {
      const peer = peersRef.current[userId];
      if (peer) {
        peer.close();
        delete peersRef.current[userId];
      }
      setRemoteStreams((prev) => prev.filter((u) => u.userId !== userId));
    });

    return () => {
      isMounted = false;
      socket.disconnect();

      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      setRemoteStreams([]);
    };
  }, [id]);

  const createPeerConnection = (remoteUserId: string, isOfferer: boolean) => {
    const socket = socketRef.current;
    const peer = new RTCPeerConnection(ICE_CONFIG);

    peersRef.current[remoteUserId] = peer;
    const stream = localStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    }

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
      (async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("offer", {
          to: remoteUserId,
          from: socket.id,
          sdp: offer,
        });
      })();
    }

    return peer;
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-center mb-4">Room: {id}</h2>

      {connecting && (
        <p className="text-center mb-4 text-gray-400">
          Connecting to camera & room...
        </p>
      )}

      {/* Live Video Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col items-center">
          <div className="mb-1 text-sm text-gray-300">
            You ({nameRef.current})
          </div>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video bg-black rounded-lg border border-gray-600"
          />
        </div>

        {remoteStreams.map(({ userId, stream }) => (
          <div key={userId} className="flex flex-col items-center">
            <div className="mb-1 text-sm text-gray-300">
              User {userId.slice(0, 6)}
            </div>
            <video
              autoPlay
              playsInline
              className="w-full aspect-video bg-black rounded-lg border border-gray-600"
              ref={(el) => {
                if (el && stream) {
                  // @ts-ignore
                  el.srcObject = stream;
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Meeting Users Cards */}
      <h3 className="text-lg font-semibold mt-6 mb-2">Participants History</h3>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {meetingData?.users?.map((u) => (
          <div
            key={u.userId}
            className="p-3 bg-gray-800 text-white rounded border border-gray-600"
          >
            <p className="font-bold">{u.name}</p>
            <p className="text-sm">
              Joined: {new Date(u.joinedAt).toLocaleString()}
            </p>
            <p className="text-sm">
              Left: {u.leftAt ? new Date(u.leftAt).toLocaleString() : "Online"}
            </p>
          </div>
        ))}
      </div>

      {/* Copy link button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("Meeting link copied!");
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Copy Invite Link
        </button>
      </div>
    </div>
  );
}
