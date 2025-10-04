"use client";
import React, { useEffect, useRef, useState } from "react";

export default function MeetingPage({ params }: { params: { id: string } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const startVideo = async () => {
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(userStream);
      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
      }
    };
    startVideo();
  }, []);

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
    </div>
  );
}
