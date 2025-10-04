import { Server } from "socket.io";

const ioHandler = (req: any, res: any) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    io.on("connection", (socket) => {
      socket.on("join-room", (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-joined", socket.id);
      });

      socket.on("signal", (data) => {
        socket.to(data.roomId).emit("signal", data);
      });
    });
    res.socket.server.io = io;
  }
  res.end();
};
export const GET = ioHandler;
