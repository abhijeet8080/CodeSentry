import http from "http";
import { logger } from "@config/logger";

export function startHealthServer(port: number) {
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url?.split("?")[0] === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    logger.info({ port }, "Worker health server listening");
  });

  return server;
}
