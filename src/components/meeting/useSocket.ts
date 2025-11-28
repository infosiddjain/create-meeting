import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(roomId: string, name: string, isHost: boolean) {
  const socketRef = useRef<Socket | null>(null);

  const [isWaiting, setIsWaiting] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  useEffect(() => {
    const socket = io("https://node-meeting.onrender.com", {
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-meeting", { roomId, name, isHost });
    });

    socket.on("waiting-for-host", () => setIsWaiting(true));
    socket.on("rejected", () => setIsRejected(true));

    socket.on("allowed-to-join", () => {
      setAllowed(true);
      setIsWaiting(false);
    });

    socket.on("user-waiting", (u) => {
      if (isHost) {
        setPendingUsers((prev) =>
          prev.find((p) => p.userId === u.userId) ? prev : [...prev, u]
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, name, isHost]);

  return { socketRef, isWaiting, isRejected, allowed, pendingUsers };
}
