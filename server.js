require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");

const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

/* TWILIO CONFIGURATION */
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilio = require("twilio")(accountSid, authToken);

const rooms = {};

io.on("connection", (socket) => {
  console.log(`>>> New connection`);

  /* TWILIO TOKEN GENERATION */
  socket.on("token", () => {
    twilio.tokens
      .create()
      .then((token) => {
        socket.emit("token", token);
        console.log(`>>> Twilio token: ${token.username}`);
      })
      .catch((err) => console.log(err));
  });

  /* CREATE OR JOIN ROOM */
  socket.on("createOrJoinRoom", (room) => {
    if (rooms[room]) {
      const usersInRoom = rooms[room].length;
      const joiner = socket.id;

      if (usersInRoom === 1) {
        rooms[room].push(joiner);
        console.log(`>>> Joiner-${joiner} just joined room`);
        // socket.emit("otherUser", socket);
        socket.broadcast.emit("userJoinedRoom", joiner);
      } else {
        socket.emit("fullRoomMessage", joiner);
        console.log(`>>> Room is already full!`);
      }
    } else {
      const initiator = [socket.id];
      rooms[room] = initiator;
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
  socket.on("iceCandidate", (payload) => {
    console.log(`>>> IceCandidate: ${JSON.stringify(payload)}`);
    // io.to(payload.target).emit("iceCandidate", payload.candidate);
    socket.broadcast.emit("iceCandidate", payload.candidate);
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
