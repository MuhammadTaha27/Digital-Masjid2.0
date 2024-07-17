const fs = require("fs");
const path = require("path");
const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const os = require('os');

const app = express();
const HTTP_PORT = process.env.HTTP_PORT || 8000;
const DEFAULT_WS_PORT = process.env.DEFAULT_WS_PORT || 8888;

let topicServers = {};
const serverIp = getServerIp();
// Create a WebSocket server for a specific topic
function createTopicServer(topic) {
  const topicPort = DEFAULT_WS_PORT + Object.keys(topicServers).length + 1;
  const wsServer = new WebSocket.Server({ port: topicPort });

  let connectedClients = [];
  let audioStream = [];

  wsServer.on("connection", (ws) => {
    console.log(`Connected to topic: ${topic}`);
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

  return { server: wsServer, port: topicPort };
}

// Serve static files
app.use("/image", express.static("image"));
app.use("/js", express.static("js"));
app.get("/audio", (req, res) =>
  res.sendFile(path.resolve(__dirname, "./audio_client.html"))
);
app.get("/get-topics", (req, res) => {
  const topics = Object.keys(topicServers);
  res.json(topics);
});
// Create HTTP server
const server = http.createServer(app);

// Create default WebSocket server
const defaultWSServer = new WebSocket.Server({ port:DEFAULT_WS_PORT }, () =>
  console.log(`WS server is listening at ws://${serverIp}:${DEFAULT_WS_PORT }`)
);

function getServerIp() {
  const interfaces = os.networkInterfaces();
  for (const iface in interfaces) {
      for (const alias of interfaces[iface]) {
          if (alias.family === 'IPv4' && !alias.internal) {
              return alias.address;
          }
      }
  }
  return 'localhost'; // Fallback to localhost if no external IP is found
}


defaultWSServer.on("connection", (ws) => {
  console.log("Client connected to default WebSocket server");
  
  ws.on("message", (message) => {
    const { topic } = JSON.parse(message);

    if (!topic) {
      ws.send(JSON.stringify({ error: "No topic specified" }));
      return;
    }

    if (!topicServers[topic]) {
      topicServers[topic] = createTopicServer(topic);
    }

    const topicPort = topicServers[topic].port;
    ws.send(topicPort);
  });
});

// Start the server
server.listen(HTTP_PORT, () => 
  console.log(`HTTP server listening at http://localhost:${HTTP_PORT}`)
);

