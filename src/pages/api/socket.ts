import { Server } from "socket.io";

export default function handler(req: any, res: any) {
  if (!res.socket.server.io) {
    console.log("Starting Socket.io server...");

    const io = new Server(res.socket.server, {
      path: "/api/socket/io",
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("check-role", (roomId) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        const isHost = !room;
        socket.emit("role", isHost ? "host" : "guest");
      });

      socket.on("request-join", ({ roomId, name }) => {
        socket.to(roomId).emit("join-request", { id: socket.id, name });
      });

      socket.on("approve-user", ({ roomId, userId }) => {
        io.to(userId).emit("approved");
      });

      socket.on("join-room", (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-joined", socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
