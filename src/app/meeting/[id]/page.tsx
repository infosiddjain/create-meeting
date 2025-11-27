"use client";
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function MeetingPage({ params }: { params: { id: string } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // connect socket
    socketRef.current = io();

    // join-room event send to backend
    socketRef.current.emit("join-room", params.id);

    // play my video
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((userStream) => {
        setStream(userStream);
        if (videoRef.current) videoRef.current.srcObject = userStream;
      });

    // listen someone joined
    socketRef.current.on("user-joined", (userId: string) => {
      console.log("New user joined >> ", userId);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [params.id]);

  const handleShareScreen = async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    if (videoRef.current) {
      videoRef.current.srcObject = screenStream;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-10">
      <h2 className="text-xl font-bold">Meeting ID: {params.id}</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-1/2 rounded-lg border"
      />
      <div className="flex gap-4">
        <button
          onClick={handleShareScreen}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Share Screen
        </button>
      </div>
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
  );
}
