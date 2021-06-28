const express = require("express");
const app = express();
const server = require("http").Server(app);
app.use(express.static("public"));
const io = require("socket.io")(server);

server.listen(5500);
console.log("Listening on 5500");

let room = {
  gameNum: 0,
  players: 1,
  gameStarted: false,
  spectators: {},
};

io.on("connection", (socket) => {
  console.log("Connection");

  socket.join(room.gameNum);
  io.to(room.gameNum).emit("roleAssignement", socket.id, room.players);
  room.players++;

  //Game set-up
  socket.on("startGame", () => {
    io.to(room.gameNum).emit("gameStarted");
    room.gameStarted = true;
  });
  socket.on("addSpectator", () => {
    room.spectators[socket.id] = true;
    io.to(room.gameNum).emit("requestBoard");
  });

  socket.on("disconnecting", () => {
    if (!socket.rooms.has(room.gameNum)) {
      console.log("Old room");
      return;
    }

    if (room.spectators[socket.id]) {
      delete room.spectators[socket.id];
      return;
    }

    room.players = 1;
    io.to(room.gameNum).emit("forfeit");
    room.gameNum++;

    console.log("Disconnected", room.players);
  });

  //Play
  socket.on("launching", (mouseData, profile) => {
    io.to(room.gameNum).emit("opponentLaunching", mouseData, profile);
  });
  socket.on("launchBall", (mouseData, profile) => {
    io.to(room.gameNum).emit("launchedBall", mouseData, profile);
  });
  socket.on("switchTurns", (profile) => {
    io.to(room.gameNum).emit("turnSwitch", profile);
  });
  socket.on("opponentLoss", (profile) => {
    io.to(room.gameNum).emit("youLoose", profile);
    room.players = 1;
    room.gameNum++;
  });
  socket.on("opponentWin", (profile) => {
    io.to(room.gameNum).emit("youWin", profile);
    room.players = 1;
    room.gameNum++;
  });

  //For my fellow spectators
  socket.on("currentGameSent", (balls) => {
    socket.to(room.gameNum).emit("ballData", balls, "spectator");
  });
  socket.on("updateBalls", (balls, receiver) => {
    socket.to(room.gameNum).emit("ballData", balls, receiver);
  });
});
