import { Server } from "socket.io";
import http from "http";

export function createSocketServer(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // Adjust for your frontend domain in production!
    },
  });

  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });

    socket.on("approve_tool_call", (data) => {
      console.log("User approved tool call:", data);
      // TODO: handle approval in your app logic
    });

    socket.on("reject_tool_call", (data) => {
      console.log("User rejected tool call:", data);
      // TODO: handle rejection in your app logic
    });
  });

  return io;
}
