"use client";

import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function MeetingPageClient({ id }: { id: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const socketRef = useRef<any>(null);
  const [role, setRole] = useState<"host" | "guest" | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [guestName, setGuestName] = useState("");

  useEffect(() => {
    socketRef.current = io(window.location.origin, {
      path: "/api/socket/io",
      transports: ["polling", "websocket"],
    });

    socketRef.current.emit("check-role", id);

    socketRef.current.on("role", (type: any) => setRole(type));

    socketRef.current.on("approved", () => {
      joinRoom();
    });

    socketRef.current.on("join-request", (user: any) =>
      setRequests((prev) => [...prev, user])
    );

    return () => socketRef.current.disconnect();
  }, [id]);

  const joinRoom = () => {
    socketRef.current.emit("join-room", id);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      });
  };

  const requestJoin = () => {
    socketRef.current.emit("request-join", { roomId: id, name: guestName });
  };

  const approveUser = (userId: string) => {
    socketRef.current.emit("approve-user", { roomId: id, userId });
    setRequests((prev) => prev.filter((u) => u.id !== userId));
  };

  if (role === "guest" && !stream) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold mb-4">Ask to Join Meeting</h2>
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Enter your name"
          className="border p-2"
        />
        <button
          disabled={!guestName}
          onClick={requestJoin}
          className="ml-3 bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          Request to Join
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 mt-10">
      <h2 className="text-xl font-bold">
        Meeting ID: {id} ({role})
      </h2>

      {role === "host" && requests.length > 0 && (
        <div className="bg-gray-200 p-3 rounded shadow-lg">
          {requests.map((u) => (
            <div key={u.id} className="flex justify-between mb-2">
              <span>{u.name} wants to join</span>
              <button
                onClick={() => approveUser(u.id)}
                className="bg-green-500 text-white px-2 py-1 rounded"
              >
                Allow
              </button>
            </div>
          ))}
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-1/2 rounded-lg border"
      />

      <button
        onClick={() => {
          navigator.clipboard.writeText(window.location.href);
          alert("Copied!");
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Copy Invite Link
      </button>
    </div>
  );
}
