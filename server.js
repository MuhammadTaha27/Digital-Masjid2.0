const fs = require("fs");
const path = require("path");
const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 443;

function getServerIp() {
  const interfaces = os.networkInterfaces();
  for (let iface in interfaces) {
    for (let alias of interfaces[iface]) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback to localhost if no external IP is found
}
// HTTP server
const server = http.createServer(app);

// WebSocket server
const wsServer = new WebSocket.Server({ server });

// array of connected websocket clients
let connectedClients = [];
let audioStream = [];

wsServer.on("connection", (ws, req) => {
  console.log("Connected");
  connectedClients.push(ws);
  ws.on("message", (data) => {
    audioStream.push(data);
    connectedClients.forEach((client, i) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      } else {
        connectedClients.splice(i, 1);
      }
    });
  });
  ws.on("close", () => {
    audioStream.push(null); // Signal the end of the stream
  });
});

// HTTP stuff
app.use("/image", express.static("image"));
app.use("/js", express.static("js"));
app.get("/audio", (req, res) =>
  res.sendFile(path.resolve(__dirname, "./audio_client.html"))
);

server.listen(PORT, () => {
  const ip = getServerIp();
  console.log(`Server listening at http://${ip}:${PORT}`);
});
