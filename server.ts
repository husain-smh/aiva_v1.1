import next from "next";
import http from "http";
import { createSocketServer } from "./socketServer";

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: process.env.NODE_ENV !== "production" });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  // Attach Socket.IO server
  const io = createSocketServer(server);

  server.listen(port, () => {
    console.log(`> Server listening on http://localhost:${port}`);
  });
});
