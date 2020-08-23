require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const rooms = {};

io.on("connection", (socket) => {
  console.log(`>>> New connection`);

  socket.on("disconnecting", (message) => {
    console.log(`>>> User ${message}`);
    console.log(`>>> Disconnect message: ${message}`);
  });

  /* CREATE OR JOIN ROOM */
  socket.on("createOrJoinRoom", (room) => {
    if (rooms[room]) {
      const usersInRoom = rooms[room].length;
      const joiner = socket.id;

      if (usersInRoom === 1) {
        rooms[room].push(joiner);
        console.log(`>>> Joiner-${joiner} just joined room`);
        socket.broadcast.emit("userJoinedRoom", joiner);
      } else {
        socket.emit("fullRoomMessage", joiner);
        console.log(`>>> Room is already full!`);
      }
    } else {
      const initiator = socket.id;
      rooms[room] = [initiator];
      console.log(`>>> Initiator-${initiator} created a new room`);
    }
  });

  /* OFFER */
  socket.on("offer", (payload) => {
    io.to(payload.target).emit("offer", payload);
  });

  /* ANSWER */
  socket.on("answer", (payload) => {
    io.to(payload.target).emit("answer", payload);
  });

  /* ICECANDIDATE */
  socket.on("iceCandidate", (incoming) => {
    io.to(incoming.target).emit("iceCandidate", incoming.candidate);
  });
});

/* HANDLING PRODUCTION ENVIRORMENT */
if (process.env.PROD) {
  app.use(express.static(path.join(__dirname, "./client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "./client/build/index.html"));
  });
}

const PORT = process.env.PORT || 8081;
server.listen(PORT, (err) => {
  if (err) throw err;
  console.log(`Server running on port ${PORT}`);
});
