// meetingPageClient.js
"use client";

import { useEffect, useState } from "react";
import MeetingWaitingScreen from "@/components/meeting/MeetingWaitingScreen";
import MeetingUI from "@/components/meeting/MeetingUI";

import { useSocket } from "@/components/meeting/useSocket";
import { useWebRTC } from "@/components/meeting/useWebRTC";
import { useMediaControls } from "@/components/meeting/useMediaControls";

export default function MeetingPageClient({ id, role }: any) {
  const isHost = role === "host";
  const name = "User-" + Math.floor(Math.random() * 9000);

  const { socketRef, isWaiting, isRejected, allowed, pendingUsers } = useSocket(
    id,
    name,
    isHost
  );

  const {
    peersRef,
    localStreamRef,
    localVideoRef,
    remoteStreams,
    initLocalMedia,
    createPeer,
    setRemoteStreams,
  } = useWebRTC(socketRef);

  const { micOn, videoOn, toggleMic, toggleVideo, shareScreen } =
    useMediaControls(localStreamRef, peersRef);

  const [meetingData, setMeetingData] = useState<any>(null);

  // Effects
  useEffect(() => {
    fetch(`https://node-meeting.onrender.com/meeting/${id}`)
      .then((res) => res.json())
      .then(setMeetingData);
  }, []);

  useEffect(() => {
    if (!allowed) return;

    initLocalMedia().then((stream) => {
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      socketRef.current?.emit("join-room", {
        roomId: id,
        name,
        isHost,
      });
    });
  }, [allowed]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("existing-users", (users) => {
      users.forEach((id: any) => createPeer(id, true));
    });

    socket.on("user-joined", ({ userId }) => {
      createPeer(userId, false);
    });

    socket.on("offer", async ({ from, sdp }) => {
      const peer = peersRef.current[from] || createPeer(from, false);
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket?.emit("answer", { to: from, from: socket.id, sdp: answer });
    });

    socket.on("answer", async ({ from, sdp }) => {
      const peer = peersRef.current[from];
      if (peer) await peer.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      const peer = peersRef.current[from];
      if (peer && candidate)
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("user-left", ({ userId }) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }
      setRemoteStreams((prev) => prev.filter((s) => s.userId !== userId));
    });

    return () => {
      socket.off("existing-users");
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-left");
    };
  }, []);

  if (isRejected)
    return (
      <div className="h-screen bg-red-800 text-white flex items-center justify-center text-2xl">
        Request Rejected
      </div>
    );

  // if (isWaiting) return <MeetingWaitingScreen id={id} />;

  return (
    <MeetingUI
      id={id}
      name={name}
      isHost={isHost}
      localVideoRef={localVideoRef}
      remoteStreams={remoteStreams}
      pendingUsers={pendingUsers}
      approveUser={(u: any) =>
        socketRef.current?.emit("approve-user", { roomId: id, userId: u })
      }
      rejectUser={(u: any) =>
        socketRef.current?.emit("reject-user", { roomId: id, userId: u })
      }
      micOn={micOn}
      videoOn={videoOn}
      toggleMic={toggleMic}
      toggleVideo={toggleVideo}
      shareScreen={shareScreen}
      leaveMeeting={() => (window.location.href = "/")}
      meetingData={meetingData}
    />
  );
}
