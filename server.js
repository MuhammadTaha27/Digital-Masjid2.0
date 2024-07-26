const fs = require("fs");
const path = require("path");
const express = require("express");
const WebSocket = require("ws");
const wav = require('wav');
const app = express();
const stream = require('stream');

const WS_PORT = process.env.WS_PORT || 8888;
const HTTP_PORT = process.env.HTTP_PORT || 8000;

const wsServer = new WebSocket.Server({ port: WS_PORT }, () =>
  console.log(`WS server is listening at ws://localhost:${WS_PORT}`)
);

// array of connected websocket clients
let connectedClients = [];
let audioStream = [];

wsServer.on("connection", (ws, req) => {
  console.log("Connected");
  connectedClients.push(ws);
  ws.on("message", (data) => {
    audioStream.push(data);
    connectedClients.forEach((ws, i) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
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


app.listen(HTTP_PORT, () =>
  console.log(`HTTP server listening at http://localhost:${HTTP_PORT}`)
);

