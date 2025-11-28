// MeetingUI.tsx

import React from "react";

export default function MeetingUI({
  id,
  name,
  isHost,
  localVideoRef,
  remoteStreams,
  pendingUsers,
  approveUser,
  rejectUser,
  micOn,
  videoOn,
  toggleMic,
  toggleVideo,
  shareScreen,
  leaveMeeting,
  meetingData,
}: any) {
  return (
    <div className="min-h-screen bg-[#0f1720] text-white flex flex-col">
      <div className="p-4 border-b border-gray-800 flex justify-between">
        <div>
          <h2 className="text-lg font-semibold">Room: {id}</h2>
          <p className="text-xs text-gray-400">
            {name} {isHost && "(Host)"}
          </p>
        </div>

        <p className="text-xs text-gray-400">
          Participants: {meetingData?.users?.length || 0}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl h-[70vh] bg-green-800 rounded-xl relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-52 h-52 rounded-full border-4 border-white/30 object-cover"
          />

          {remoteStreams.map((u: any) => (
            <video
              key={u.userId}
              autoPlay
              playsInline
              className="absolute w-40 h-40 bottom-4 right-4 rounded-lg"
              ref={(el) => el && (el.srcObject = u.stream)}
            />
          ))}
        </div>
      </div>

      {isHost && pendingUsers.length > 0 && (
        <div className="fixed bottom-24 right-6 bg-white text-black p-4 rounded-lg shadow-lg">
          <h3 className="font-semibold mb-2">Join Requests</h3>

          {pendingUsers.map((u: any) => (
            <div key={u.userId} className="flex justify-between mb-2">
              <span>{u.name}</span>
              <div className="space-x-2">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => approveUser(u.userId)}
                >
                  Allow
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded"
                  onClick={() => rejectUser(u.userId)}
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 flex justify-center space-x-6 border-t border-gray-800">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full ${micOn ? "bg-white/10" : "bg-red-600"}`}
        >
          {micOn ? "speak" : "mute"}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${
            videoOn ? "bg-white/10" : "bg-red-600"
          }`}
        >
          {videoOn ? "video on" : "video off"}
        </button>

        <button onClick={shareScreen} className="p-3 rounded-full bg-white/10">
          share screen
        </button>

        <button onClick={leaveMeeting} className="p-3 rounded-full bg-red-600">
          call end
        </button>
      </div>
    </div>
  );
}
