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

  // approval / waiting UI states
  const [isWaiting, setIsWaiting] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<
    { userId: string; name: string }[]
  >([]);

  const socketRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [userId: string]: RTCPeerConnection }>({});
  const nameRef = useRef<string>("User-" + Math.floor(Math.random() * 1000));

  // role detection: ?role=host
  const [isHost, setIsHost] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setIsHost(params.get("role") === "host");
    } catch (e) {
      setIsHost(false);
    }
  }, []);

  // mic / video enabled state
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  // fetch meeting participants history
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

  // helper to start local media and join room (emits "join-room")
  const startMediaAndJoin = async (socket: any, emitIsHost = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // set initial mic/video states
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      if (audioTrack) audioTrack.enabled = micOn;
      if (videoTrack) videoTrack.enabled = videoOn;

      // finally emit join-room (server will save and notify other users)
      socket.emit("join-room", {
        roomId: id,
        name: nameRef.current,
        isHost: emitIsHost,
      });
      setConnecting(false);
      setIsWaiting(false);
      setIsRejected(false);
    } catch (err) {
      console.error("getUserMedia error:", err);
      setConnecting(false);
    }
  };

  useEffect(() => {
    const socket = io("https://node-meeting.onrender.com", {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    let isMounted = true;

    // When connected, request to join. Host should request with isHost flag
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);

      // If host, send join-request with isHost true (server will allow immediately)
      socket.emit("join-request", {
        roomId: id,
        name: nameRef.current,
        isHost,
      });

      // server will either respond allowed-to-join (host or approved) or waiting-for-host
      fetchMeetingDetails();
    });

    // server tells client it's waiting
    socket.on("waiting-for-host", () => {
      setIsWaiting(true);
      setConnecting(false);
    });

    // server tells client they are rejected
    socket.on("rejected", () => {
      setIsRejected(true);
      setIsWaiting(false);
      setConnecting(false);
    });

    // server tells client they are allowed — now start media & actually join
    socket.on("allowed-to-join", ({ roomId: serverRoomId }: any) => {
      // double-check roomId
      if (!isMounted) return;
      startMediaAndJoin(socket, isHost);
      fetchMeetingDetails();
    });

    // host receives waiting user notifications
    socket.on("user-waiting", (u: { userId: string; name: string }) => {
      setPendingUsers((prev) => {
        if (prev.find((p) => p.userId === u.userId)) return prev;
        return [...prev, u];
      });
    });

    // WebRTC / meeting events
    socket.on("existing-users", (users: string[]) => {
      console.log("Existing users in room:", users);
    });

    socket.on("user-joined", ({ userId }) => {
      console.log("User joined room:", userId);
      if (!localStreamRef.current) return;
      createPeerConnection(userId, true);
      fetchMeetingDetails();
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
      fetchMeetingDetails();
    });

    socket.on("host-left", () => {
      // host left - guests might need to wait until new host arrives
      // optional behavior: show notification
      console.log("Host left the room");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isHost]);

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

  // Host approves a pending user (emit to server)
  const approveUser = (userId: string) => {
    socketRef.current.emit("approve-user", { roomId: id, userId });
    setPendingUsers((prev) => prev.filter((p) => p.userId !== userId));
  };

  const rejectUser = (userId: string) => {
    socketRef.current.emit("reject-user", { roomId: id, userId });
    setPendingUsers((prev) => prev.filter((p) => p.userId !== userId));
  };

  // toggle mic
  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  // toggle camera
  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoOn(videoTrack.enabled);
    }
  };

  // leave meeting
  const leaveMeeting = () => {
    socketRef.current.disconnect();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    // redirect or update UI
    window.location.href = "/";
  };

  // UI states: waiting / rejected
  if (isRejected) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-900 text-white">
        <h2 className="text-2xl font-bold">Your request was denied by host.</h2>
      </div>
    );
  }

  if (isWaiting) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <div className="text-2xl font-semibold mb-2">
          Waiting for host to let you in...
        </div>
        <div className="text-sm text-gray-300 mb-4">
          Host will approve your request shortly.
        </div>
        <div className="text-xs text-gray-500">Room: {id}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1720] text-white flex flex-col">
      {/* top area: room id */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Room: {id}</h2>
          <div className="text-xs text-gray-400">
            You: {nameRef.current} {isHost ? "(Host)" : ""}
          </div>
        </div>
        <div className="text-xs text-gray-400">
          Participants: {meetingData?.users?.length || 0}
        </div>
      </div>

      {/* Main video grid */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl h-[65vh] bg-gradient-to-br from-green-600 to-green-800 rounded-2xl relative overflow-hidden">
          {/* center avatar / local video */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover bg-black"
              />
            </div>
            <div className="text-center mt-3 text-white/90">
              {nameRef.current}
            </div>
          </div>
        </div>
      </div>

      {/* bottom controls and host pending panel */}
      <div className="p-4 border-t border-gray-800">
        {/* host pending requests (top-right like Google Meet small popup) */}
        {isHost && pendingUsers.length > 0 && (
          <div className="fixed right-6 bottom-24 bg-white text-black p-4 rounded-lg shadow-lg z-50 w-72">
            <div className="font-semibold mb-2">Join requests</div>
            {pendingUsers.map((u) => (
              <div
                key={u.userId}
                className="flex items-center justify-between mb-2"
              >
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-gray-500">
                    ID: {u.userId.slice(0, 6)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => approveUser(u.userId)}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                  >
                    Allow
                  </button>
                  <button
                    onClick={() => rejectUser(u.userId)}
                    className="px-3 py-1 bg-red-600 text-white rounded"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* bottom control bar */}
        <div className="flex items-center justify-center space-x-6">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full ${
              micOn ? "bg-white/10" : "bg-red-600"
            } `}
            title={micOn ? "Mute" : "Unmute"}
          >
            {micOn ? "🎤" : "🔇"}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              videoOn ? "bg-white/10" : "bg-red-600"
            } `}
            title={videoOn ? "Turn camera off" : "Turn camera on"}
          >
            {videoOn ? "🎥" : "📷"}
          </button>

          <button
            onClick={() => {
              // share screen (optional)
              if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices
                  .getDisplayMedia({ video: true })
                  .then((screenStream) => {
                    // replace video track in all peer connections
                    const screenTrack = screenStream.getVideoTracks()[0];
                    Object.values(peersRef.current).forEach((pc) => {
                      const sender = pc
                        .getSenders()
                        .find((s) => s.track?.kind === "video");
                      sender?.replaceTrack(screenTrack);
                    });

                    // when screen share ends, revert to webcam
                    screenTrack.onended = () => {
                      const camTrack =
                        localStreamRef.current?.getVideoTracks()[0];
                      Object.values(peersRef.current).forEach((pc) => {
                        const sender = pc
                          .getSenders()
                          .find((s) => s.track?.kind === "video");
                        sender?.replaceTrack(camTrack || null);
                      });
                    };
                  })
                  .catch((e) => console.error("screen share failed", e));
              } else {
                alert("Screen share not supported");
              }
            }}
            className="p-3 rounded-full bg-white/10"
            title="Share screen"
          >
            🖥
          </button>

          <button
            onClick={leaveMeeting}
            className="p-3 rounded-full bg-red-600 text-white"
          >
            📞
          </button>
        </div>

        {/* participants history cards */}
        <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {meetingData?.users?.map((u) => (
            <div
              key={u.userId}
              className="p-3 bg-gray-800 rounded border border-gray-700"
            >
              <div className="flex justify-between items-center">
                <div className="font-semibold">{u.name}</div>
                <div className="text-xs text-gray-400">
                  {u.userId.slice(0, 6)}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Joined: {new Date(u.joinedAt).toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">
                Left:{" "}
                {u.leftAt ? new Date(u.leftAt).toLocaleString() : "Online"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
