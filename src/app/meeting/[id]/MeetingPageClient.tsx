// "use client";
// import React, { useEffect, useRef, useState } from "react";
// import { io } from "socket.io-client";
// import MeetingControls from "./MeetingControls";
// import ChatSidebar from "@/components/ChatSidebar";

// type RemoteStream = { userId: string; stream: MediaStream };
// type MeetingUser = {
//   userId: string;
//   name: string;
//   joinedAt: string;
//   leftAt?: string;
// };
// type MeetingData = { roomId: string; users: MeetingUser[] };

// const ICE_CONFIG: RTCConfiguration = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
// };

// export default function MeetingPageClient({
//   id,
//   role,
// }: {
//   id: string;
//   role: string;
// }) {
//   console.log("User role:", role);
//   const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//   const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
//   const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
//   const [connecting, setConnecting] = useState(true);

//   const [chatOpen, setChatOpen] = useState(false);
//   const [messages, setMessages] = useState<any[]>([]);
//   const [message, setMessage] = useState("");

//   const [micOn, setMicOn] = useState(true);
//   const [camOn, setCamOn] = useState(true);

//   const socketRef = useRef<any>(null);
//   const localVideoRef = useRef<HTMLVideoElement | null>(null);
//   const localStreamRef = useRef<MediaStream | null>(null);
//   const peersRef = useRef<{ [userId: string]: RTCPeerConnection }>({});
//   const nameRef = useRef<string>("User-" + Math.floor(Math.random() * 1000));

//   const fetchMeetingDetails = async () => {
//     try {
//       const res = await fetch(
//         `https://node-meeting.onrender.com/meeting/${id}`
//       );
//       const data = await res.json();
//       setMeetingData(data);
//     } catch (err) {
//       console.log("Failed to load meeting data");
//     }
//   };

//   useEffect(() => {
//     fetchMeetingDetails();
//     const interval = setInterval(fetchMeetingDetails, 5000);
//     return () => clearInterval(interval);
//   }, [id]);

//   useEffect(() => {
//     const socket = io("https://node-meeting.onrender.com", {
//       transports: ["websocket"],
//     });
//     socketRef.current = socket;

//     let isMounted = true;

//     const start = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: true,
//           audio: true,
//         });

//         if (!isMounted) {
//           stream.getTracks().forEach((t) => t.stop());
//           return;
//         }

//         localStreamRef.current = stream;
//         setLocalStream(stream);

//         if (localVideoRef.current) localVideoRef.current.srcObject = stream;

//         socket.emit("join-room", { roomId: id, name: nameRef.current });
//         setConnecting(false);
//       } catch (err) {
//         console.error("getUserMedia error:", err);
//         setConnecting(false);
//       }
//     };

//     socket.on("chat-message", (msg) => {
//       setMessages((prev) => [...prev, msg]);
//     });

//     socket.on("connect", () => {
//       start();
//       fetchMeetingDetails();
//     });

//     socket.on("user-joined", ({ userId }) => {
//       if (!localStreamRef.current) return;
//       createPeerConnection(userId, true);
//       fetchMeetingDetails();
//     });

//     socket.on("user-left", ({ userId }) => {
//       const peer = peersRef.current[userId];
//       if (peer) {
//         peer.close();
//         delete peersRef.current[userId];
//       }
//       setRemoteStreams((prev) => prev.filter((u) => u.userId !== userId));
//       fetchMeetingDetails();
//     });

//     socket.on("offer", async ({ from, sdp }) => {
//       const peer = createPeerConnection(from, false);
//       await peer.setRemoteDescription(new RTCSessionDescription(sdp));
//       const answer = await peer.createAnswer();
//       await peer.setLocalDescription(answer);

//       socket.emit("answer", { to: from, from: socket.id, sdp: answer });
//     });

//     socket.on("answer", async ({ from, sdp }) => {
//       const peer = peersRef.current[from];
//       if (!peer) return;
//       await peer.setRemoteDescription(new RTCSessionDescription(sdp));
//     });

//     socket.on("ice-candidate", async ({ from, candidate }) => {
//       const peer = peersRef.current[from];
//       if (!peer) return;
//       try {
//         await peer.addIceCandidate(new RTCIceCandidate(candidate));
//       } catch (err) {
//         console.error("Error adding ICE candidate", err);
//       }
//     });

//     return () => {
//       isMounted = false;
//       socket.disconnect();
//       Object.values(peersRef.current).forEach((pc) => pc.close());
//       peersRef.current = {};
//       if (localStreamRef.current)
//         localStreamRef.current.getTracks().forEach((t) => t.stop());
//       setRemoteStreams([]);
//     };
//   }, [id]);

//   const createPeerConnection = (
//     remoteUserId: string,
//     isOfferer: boolean
//   ): RTCPeerConnection => {
//     const socket = socketRef.current;
//     const peer = new RTCPeerConnection(ICE_CONFIG);

//     peersRef.current[remoteUserId] = peer;

//     const stream = localStreamRef.current;
//     if (stream) {
//       stream.getTracks().forEach((track) => peer.addTrack(track, stream));
//     }

//     peer.onicecandidate = (event) => {
//       if (event.candidate) {
//         socket.emit("ice-candidate", {
//           to: remoteUserId,
//           from: socket.id,
//           candidate: event.candidate,
//         });
//       }
//     };

//     peer.ontrack = (event) => {
//       const [remoteStream] = event.streams;
//       setRemoteStreams((prev) => {
//         const exists = prev.find((p) => p.userId === remoteUserId);
//         if (exists) {
//           return prev.map((p) =>
//             p.userId === remoteUserId ? { ...p, stream: remoteStream } : p
//           );
//         }
//         return [...prev, { userId: remoteUserId, stream: remoteStream }];
//       });
//     };

//     if (isOfferer) {
//       (async () => {
//         const offer = await peer.createOffer();
//         await peer.setLocalDescription(offer);
//         socket.emit("offer", { to: remoteUserId, from: socket.id, sdp: offer });
//       })();
//     }

//     return peer;
//   };

//   const toggleMic = () => {
//     if (!localStreamRef.current) return;
//     const track = localStreamRef.current.getAudioTracks()[0];
//     track.enabled = !track.enabled;
//     setMicOn(track.enabled);
//   };

//   const toggleCam = () => {
//     if (!localStreamRef.current) return;
//     const track = localStreamRef.current.getVideoTracks()[0];
//     track.enabled = !track.enabled;
//     setCamOn(track.enabled);
//   };

//   const startScreenShare = async () => {
//     try {
//       const screenStream = await navigator.mediaDevices.getDisplayMedia({
//         video: true,
//       });
//       const screenTrack = screenStream.getVideoTracks()[0];

//       Object.values(peersRef.current).forEach((pc) => {
//         const sender = pc.getSenders().find((s) => s.track?.kind === "video");
//         if (sender) sender.replaceTrack(screenTrack);
//       });

//       if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

//       screenTrack.onended = () => {
//         const camTrack = localStreamRef.current?.getVideoTracks()[0];
//         if (!camTrack) return;
//         Object.values(peersRef.current).forEach((pc) => {
//           const sender = pc.getSenders().find((s) => s.track?.kind === "video");
//           if (sender) sender.replaceTrack(camTrack);
//         });
//         if (localVideoRef.current && localStreamRef.current)
//           localVideoRef.current.srcObject = localStreamRef.current;
//       };
//     } catch (err) {
//       console.log("Screen share cancelled");
//     }
//   };

//   const sendChatMessage = () => {
//     if (!message.trim()) return;
//     const msg = {
//       user: nameRef.current,
//       text: message.trim(),
//       time: Date.now(),
//     };

//     socketRef.current?.emit("chat-message", { roomId: id, ...msg });

//     setMessages((prev) => [...prev, msg]);
//     setMessage("");
//   };

//   return (
//     <div className="h-screen w-screen bg-[#0d0d0d] text-white flex flex-col overflow-hidden">
//       <div className="w-full px-6 py-3 border-b border-gray-800 flex items-center justify-between bg-[#111]">
//         <div>
//           <h1 className="text-lg font-semibold">Peer Plus Meeting Room</h1>
//           <p className="text-sm text-gray-400">ID: {id}</p>
//         </div>

//         <div className="flex items-center gap-3">
//           <span className="px-3 py-1 rounded-full text-sm bg-gray-800 border border-gray-700">
//             Role: {role}
//           </span>

//           <span className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-sm">
//             {new Date().toLocaleTimeString()}
//           </span>
//         </div>
//       </div>

//       <div className="flex-1 p-4 overflow-auto custom-scrollbar">
//         <div
//           className="
//           grid gap-4
//           grid-cols-1
//           sm:grid-cols-2
//           lg:grid-cols-3
//           xl:grid-cols-4
//         "
//         >
//           <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-lg">
//             <video
//               ref={localVideoRef}
//               autoPlay
//               muted
//               playsInline
//               className="w-full h-full object-cover"
//             />
//             <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 rounded-full text-sm">
//               You ({nameRef.current})
//             </div>
//           </div>

//           {remoteStreams.map(({ userId, stream }) => (
//             <div
//               key={userId}
//               className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-lg"
//             >
//               <video
//                 autoPlay
//                 playsInline
//                 className="w-full h-full object-cover"
//                 ref={(el) => {
//                   if (el) el.srcObject = stream;
//                 }}
//               />
//               <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 rounded-full text-sm">
//                 {userId.slice(0, 6)}
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       <MeetingControls
//         micOn={micOn}
//         camOn={camOn}
//         onToggleMic={toggleMic}
//         onToggleCam={toggleCam}
//         onShareScreen={startScreenShare}
//         onCopyLink={() => {
//           navigator.clipboard.writeText(window.location.href);
//           alert("Link copied!");
//         }}
//         onLeave={() => (window.location.href = "/")}
//         onToggleChat={() => setChatOpen((s) => !s)}
//       />

//       <ChatSidebar
//         open={chatOpen}
//         messages={messages}
//         message={message}
//         setMessage={setMessage}
//         onSend={sendChatMessage}
//         username={nameRef.current}
//         onClose={() => setChatOpen(false)}
//       />
//     </div>
//   );
// }

export default function MeetingPageClient() {
  return <h1>hello</h1>;
}
