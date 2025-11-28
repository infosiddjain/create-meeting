"use client";
import {
  MessageCircle,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Phone,
  Copy,
} from "lucide-react";

export default function MeetingControls({
  onToggleMic,
  onToggleCam,
  onShareScreen,
  onCopyLink,
  onLeave,
  onToggleChat,
  micOn,
  camOn,
}: any) {
  return (
    <div
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 
                    bg-gray-900 px-6 py-3 rounded-full flex items-center gap-4 shadow-xl"
    >
      <button
        onClick={onToggleMic}
        className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white"
      >
        {micOn ? <Mic /> : <MicOff />}
      </button>

      <button
        onClick={onToggleCam}
        className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white"
      >
        {camOn ? <Video /> : <VideoOff />}
      </button>

      <button
        onClick={onShareScreen}
        className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white"
      >
        <MonitorUp />
      </button>

      <button
        onClick={onToggleChat}
        className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white"
      >
        <MessageCircle />
      </button>

      <button
        onClick={onCopyLink}
        className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white"
      >
        <Copy />
      </button>

      <button
        onClick={onLeave}
        className="p-3 bg-red-600 hover:bg-red-500 rounded-full text-white"
      >
        <Phone />
      </button>
    </div>
  );
}
