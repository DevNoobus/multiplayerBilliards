const socket = io("/");
let instruct = document.getElementById("instructions");

let startGame = false;
let eventualTurnSwitch = false;
let profile = {
  playerType: "",
  id: "",
};
let ballCount = {
  red: 7,
  blue: 7,
  eight: 1,
};
const playerColor = {
  player1: "blue",
  player2: "red",
};
const opponent = {
  player1: "player2",
  player2: "player1",
};

socket.on("connect", () => {
  profile.id = socket.id;
  console.log(profile.id);
});
socket.on("roleAssignement", (id, playerNum) => {
  if (id == profile.id) {
    if (playerNum == 1) {
      profile.playerType = "player1";
      document.body.style.backgroundColor = "blue";

      instruct.innerHTML = "WAITING FOR NEW OPPONENT...";
    } else if (playerNum == 2) {
      profile.playerType = "player2";
      document.body.style.backgroundColor = "red";

      startGame = true;
      instruct.innerHTML = "OPPONENT'S TURN...";
      socket.emit("startGame");
    } else {
      profile.playerType = "spectator";
      document.body.style.backgroundColor = "white";

      instruct.innerHTML = "SPECTATING";
      socket.emit("addSpectator");
    }
    console.log(profile.playerType);
  }
});
socket.on("gameStarted", () => {
  if (profile.playerType == "player1") {
    myTurn = true;
    instruct.innerHTML = "YOUR TURN";
  }
  startGame = true;
});
socket.on("forfeit", () => {
  let message = profile.playerType == "spectator" ? "PLAYER" : "OPPONENT";
  instruct.innerHTML = message + " DISCONNECTED";
});

let receivedMouse = {};
function sendLaunchAnimation() {
  if (myTurn) {
    socket.emit("launching", mouse, profile);
  }
}
socket.on("opponentLaunching", (mouseData, playerProfile) => {
  if (playerProfile.id == profile.id) {
    return;
  }
  receivedMouse = mouseData;
});
socket.on("launchedBall", (mouseData, playerProfile) => {
  if (playerProfile.id == profile.id) {
    return;
  }
  launch(mouseData);
});

function endOfTurn() {
  if (!eventualTurnSwitch) return;
  let ballsNotMoving = balls.every((ball) => {
    return Math.round(ball.vel * 1000) == 0;
  });
  if (!ballsNotMoving) return;
  socket.emit("updateBalls", balls, opponent[profile.playerType]);
  socket.emit("updateBalls", balls, "spectator");

  let countedBalls = countBalls();
  let myColor = playerColor[profile.playerType];

  //Loosing and winning
  if (countedBalls.eight == 0) {
    if (countedBalls[myColor] == 0) {
      socket.emit("opponentLoss", profile);
      instruct.innerHTML = "YOU WIN";
    } else {
      socket.emit("opponentWin", profile);
      instruct.innerHTML = "YOU LOST";
    }
    profile.playerType = "spectator";
    return;
  }

  if (countedBalls[myColor] < ballCount[myColor]) {
    instruct.innerHTML = "YOUR TURN AGAIN";
    myTurn = true;
  } else {
    switchTurns();
  }

  ballCount = countedBalls;
  eventualTurnSwitch = false;
}
function switchTurns() {
  socket.emit("switchTurns", profile);
  instruct.innerHTML = "OPPONENT'S TURN...";
}
socket.on("turnSwitch", (profileSent) => {
  if (profile.id == profileSent.id || profile.playerType == "spectator") return;

  myTurn = true;
  instruct.innerHTML = "YOUR TURN";
});
function countBalls() {
  let result = {};

  let countableBalls = balls.filter((ball) => {
    return ball.onTable && !ball.white;
  });

  result.blue = countableBalls.filter((ball) => {
    return !ball.eight && ball.color == "blue";
  }).length;
  result.red = countableBalls.filter((ball) => {
    return !ball.eight && ball.color == "red";
  }).length;
  result.eight = countableBalls.filter((ball) => {
    return ball.eight;
  }).length;

  return result;
}
socket.on("youWin", (profileSent) => {
  if (profile.playerType == "spectator") {
    instruct.innerHTML = playerColor[profile.playerType] + " won";
  } else if (profileSent.id != profile.id) {
    instruct.innerHTML = "YOU WIN";
    profile.playerType = "spectator";
  }
});
socket.on("youLoose", (profileSent) => {
  if (profile.playerType == "spectator") {
    instruct.innerHTML = playerColor[profileSent.playerType] + " won";
  } else if (profileSent.id != profile.id) {
    instruct.innerHTML = "YOU LOOSE";
    profile.playerType = "spectator";
  }
});
//
socket.on("requestBoard", () => {
  if (profile.playerType != "player1") return;
  socket.emit("currentGameSent", balls);
});
socket.on("ballData", (ballData, playerType) => {
  if (profile.playerType == playerType) {
    let result = [];

    result.push(new WhiteBall(ballData[0].x, ballData[0].y));

    for (let i = 1; i < ballData.length; i++) {
      result.push(
        new Ball(
          ballData[i].x,
          ballData[i].y,
          ballData[i].eight,
          ballData[i].color == "blue"
        )
      );
    }
    balls = result;
  }
});

function draw() {
  requestAnimationFrame(draw);
  c.clearRect(0, 0, canvas.width, canvas.height);

  drawTableSpacing();
  holes.forEach((hole) => {
    hole.draw();
  });

  balls.forEach((ball) => {
    ball.draw();
    ball.update();
  });

  respawn();
  drawLaunchAnimation(mouse);

  //Server Stuff
  sendLaunchAnimation();
  if (!myTurn) {
    drawLaunchAnimation(receivedMouse);
  }
  endOfTurn();
}

draw();
