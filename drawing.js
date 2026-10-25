// =====================================================
//  DRAWING: everything that paints on the screen.
//  These functions only LOOK at the game; they never change it.
//  (Loaded second, after constants.js.)
// =====================================================

const canvas = document.getElementById("board");
const pen = canvas.getContext("2d");

// Draw one square at grid position (x, y) in a color
function drawSquare(x, y, color) {
  pen.fillStyle = color;
  pen.fillRect(x * CELL, y * CELL, CELL, CELL);
}

// Draw the whole board: a checkerboard of two sandy colors, like a desert
function drawBoard() {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const isEven = (x + y) % 2 === 0;
      drawSquare(x, y, isEven ? "#e6cf9a" : "#dcc188");
    }
  }
}

// The center of a grid square, in pixels
function cellCenter(square) {
  return { x: square.x * CELL + CELL / 2, y: square.y * CELL + CELL / 2 };
}

// Draw everything: board, fly, gecko, bat, and any message on top
function draw() {
  drawBoard();
  for (const fly of flies) drawFly(fly);
  drawGecko();
  if (tongue !== null) {
    // The caught fly: first it waits for the tongue, then it rides back on the tip
    const goingBack = tongue.timeLeft < TONGUE_TIME / 2;
    drawFly(goingBack ? tongueTip() : tongue.fly);
  }
  drawBat();
  if (!started) drawStartScreen();
  else if (gameOver) drawGameOver();
  else if (paused) drawOverlay("PAUSED", isTouch ? "Tap Pause to keep playing" : "Press P to keep playing");
}

// The fly: a black body, two buzzing wings, and it jitters a little in place
function drawFly(fly) {
  const time = performance.now();
  const x = fly.x + Math.sin(time / 60) * 1.5;        // tiny buzzing wobble
  const y = fly.y + Math.cos(time / 45) * 1.5;
  const wing = 3 + Math.abs(Math.sin(time / 25)) * 3; // wings flap fast

  pen.fillStyle = "rgba(200, 230, 255, 0.85)";        // see-through wings
  pen.beginPath();
  pen.ellipse(x - 4, y - 4, wing, 3, -0.6, 0, Math.PI * 2);
  pen.ellipse(x + 4, y - 4, wing, 3, 0.6, 0, Math.PI * 2);
  pen.fill();
  pen.fillStyle = "#1a1a1a";                          // body
  pen.beginPath();
  pen.ellipse(x, y, 4, 5, 0, 0, Math.PI * 2);
  pen.fill();
  pen.fillStyle = "#c0392b";                          // red eyes
  pen.fillRect(x - 3, y - 5, 2, 2);
  pen.fillRect(x + 1, y - 5, 2, 2);
}

// The gecko is drawn from back to front: tail, legs, body, head
function drawGecko() {
  const head = cellCenter(gecko[0]);
  const body = cellCenter(gecko[1]);
  const tail = cellCenter(gecko[2]);
  const bodyDir = { x: gecko[0].x - gecko[1].x, y: gecko[0].y - gecko[1].y };   // from body toward head
  const tailDir = { x: gecko[1].x - gecko[2].x, y: gecko[1].y - gecko[2].y };   // from tail toward body

  drawTail(body, tail, tailDir);
  drawLegs(body, bodyDir);

  // Neck: a thick round line from the body to the head
  pen.strokeStyle = GECKO_GREEN;
  pen.lineWidth = 14;
  pen.lineCap = "round";
  pen.beginPath();
  pen.moveTo(body.x, body.y);
  pen.lineTo(head.x, head.y);
  pen.stroke();

  // Body: a round shape with dark spots
  pen.fillStyle = GECKO_GREEN;
  pen.beginPath();
  pen.arc(body.x, body.y, 9, 0, Math.PI * 2);
  pen.fill();
  pen.fillStyle = GECKO_DARK;
  for (const spot of [{ x: -3, y: -2 }, { x: 3, y: 2 }, { x: 2, y: -4 }, { x: -2, y: 4 }]) {
    pen.beginPath();
    pen.arc(body.x + spot.x, body.y + spot.y, 1.6, 0, Math.PI * 2);
    pen.fill();
  }

  drawGeckoHead(head, direction);
}

// The tail: a long triangle that gets thinner toward the tip
function drawTail(body, tail, dir) {
  const side = { x: -dir.y, y: dir.x };               // turned 90 degrees: points to the gecko's side
  pen.fillStyle = GECKO_GREEN;
  pen.beginPath();
  pen.moveTo(body.x + side.x * 6, body.y + side.y * 6);      // wide end, one side
  pen.lineTo(tail.x - dir.x * 10, tail.y - dir.y * 10);      // pointy tip, past the tail square
  pen.lineTo(body.x - side.x * 6, body.y - side.y * 6);      // wide end, other side
  pen.closePath();
  pen.fill();
}

// Four legs with sticky toe pads. They swing back and forth as the gecko walks.
function drawLegs(body, dir) {
  const side = { x: -dir.y, y: dir.x };
  const swing = steps % 2 === 0 ? 3 : -3;             // flips every step, so the legs wiggle
  pen.strokeStyle = GECKO_GREEN;
  pen.fillStyle = GECKO_DARK;
  pen.lineWidth = 3;
  pen.lineCap = "round";

  for (const frontOrBack of [1, -1]) {                // 1 = front legs, -1 = back legs
    for (const whichSide of [1, -1]) {                // 1 = one side, -1 = the other side
      const startX = body.x + dir.x * 5 * frontOrBack;
      const startY = body.y + dir.y * 5 * frontOrBack;
      const legSwing = swing * frontOrBack * whichSide;  // opposite legs move together, like a real lizard
      const footX = startX + side.x * 12 * whichSide + dir.x * legSwing;
      const footY = startY + side.y * 12 * whichSide + dir.y * legSwing;
      pen.beginPath();
      pen.moveTo(startX, startY);
      pen.lineTo(footX, footY);
      pen.stroke();
      pen.beginPath();
      pen.arc(footX, footY, 2.5, 0, Math.PI * 2);     // toe pad
      pen.fill();
    }
  }
}

// The head: round with a snout, big golden eyes with slit pupils, and the tongue when it's out
function drawGeckoHead(head, forward) {
  const side = { x: -forward.y, y: forward.x };

  // Tongue: only shown while it's grabbing a fly
  if (tongue !== null) {
    const tip = tongueTip();
    pen.strokeStyle = "#e0344b";
    pen.lineWidth = 3;
    pen.lineCap = "round";
    pen.beginPath();
    pen.moveTo(tip.mouth.x, tip.mouth.y);
    pen.lineTo(tip.x, tip.y);
    pen.stroke();
    pen.fillStyle = "#e0344b";                        // a sticky round tip
    pen.beginPath();
    pen.arc(tip.x, tip.y, 3, 0, Math.PI * 2);
    pen.fill();
  }

  pen.fillStyle = GECKO_GREEN;
  pen.beginPath();
  pen.arc(head.x, head.y, 10.5, 0, Math.PI * 2);                              // head: big and round
  pen.arc(head.x + forward.x * 4, head.y + forward.y * 4, 7, 0, Math.PI * 2); // a short, round snout
  pen.fill();

  const angle = Math.atan2(forward.y, forward.x);     // which way the head points, as an angle
  for (const whichSide of [1, -1]) {
    const eyeX = head.x + forward.x * 1.5 + side.x * 7 * whichSide;
    const eyeY = head.y + forward.y * 1.5 + side.y * 7 * whichSide;
    pen.fillStyle = "#f2c14e";                        // big golden eye
    pen.beginPath();
    pen.arc(eyeX, eyeY, 4.5, 0, Math.PI * 2);
    pen.fill();
    pen.fillStyle = "#111111";                        // thin slit pupil, like a real gecko
    pen.beginPath();
    pen.ellipse(eyeX, eyeY, 1.1, 3, angle, 0, Math.PI * 2);
    pen.fill();
  }
}

// Darken the board and write a big title with a smaller line under it
function drawOverlay(title, subtitle, titleSize = 28) {
  pen.fillStyle = "rgba(25, 18, 10, 0.7)";
  pen.fillRect(0, 0, canvas.width, canvas.height);
  pen.fillStyle = "#8bd450";
  pen.textAlign = "center";
  pen.font = `${titleSize}px "Press Start 2P", monospace`;
  pen.fillText(title, canvas.width / 2, canvas.height / 2);
  pen.fillStyle = "#f3ead9";
  pen.font = '11px "Press Start 2P", monospace';
  pen.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 40);
}

function drawGameOver() {
  drawOverlay("GAME OVER", isTouch ? "Tap the board to play again" : "Press SPACE to play again");
  if (newBest) {
    pen.fillStyle = "#f2c14e";
    pen.font = '14px "Press Start 2P", monospace';
    pen.fillText(`NEW BEST: ${best}!`, canvas.width / 2, canvas.height / 2 - 50);
  }
}

function drawStartScreen() {
  drawOverlay("THE GECKO AND THE BAT", isTouch ? "Tap or swipe to start" : "Press an arrow key to start", 18);
  if (best > 0) {
    pen.fillStyle = "#b8a68a";
    pen.font = '11px "Press Start 2P", monospace';
    pen.fillText(`Best so far: ${best} flies`, canvas.width / 2, canvas.height / 2 + 70);
  }
}

// How far out the tongue is: 0 = in the mouth, 1 = at the fly. It goes 0 -> 1 -> 0.
function tongueReach() {
  const progress = 1 - tongue.timeLeft / TONGUE_TIME;         // 0 at the start, 1 at the end
  return progress < 0.5 ? progress * 2 : (1 - progress) * 2;
}

// Where the tip of the tongue is right now
function tongueTip() {
  const head = cellCenter(gecko[0]);
  const mouth = { x: head.x + direction.x * 11, y: head.y + direction.y * 11 };
  const reach = tongueReach();
  return {
    x: mouth.x + (tongue.fly.x - mouth.x) * reach,
    y: mouth.y + (tongue.fly.y - mouth.y) * reach,
    mouth: mouth,
  };
}

// Draw the bat: a round body, two flapping wings, ears and yellow eyes
function drawBat() {
  if (bat === null) return;
  const x = bat.x;
  const y = bat.y;

  // Warning: a blinking red square with a growing shadow where the bat will appear
  if (bat.state === "warning") {
    const grow = 1 - bat.warningLeft / BAT_WARNING_TIME;     // goes from 0 to 1 during the warning
    const blinkOn = Math.floor(performance.now() / 100) % 2 === 0;
    pen.fillStyle = "rgba(42, 31, 61, 0.45)";                 // the bat's shadow, getting bigger
    pen.beginPath();
    pen.ellipse(x, y, 4 + grow * 10, 2 + grow * 5, 0, 0, Math.PI * 2);
    pen.fill();
    if (blinkOn) {
      pen.strokeStyle = "#d93a3a";
      pen.lineWidth = 3;
      pen.strokeRect(x - CELL / 2 + 2, y - CELL / 2 + 2, CELL - 4, CELL - 4);
    }
    return;                                                   // no bat yet!
  }

  const flap = Math.sin(performance.now() / 70) * 6;   // goes up and down over time

  pen.fillStyle = "#2a1f3d";
  // Left wing
  pen.beginPath();
  pen.moveTo(x - 4, y);
  pen.lineTo(x - 20, y - 6 + flap);
  pen.lineTo(x - 14, y + 2);
  pen.lineTo(x - 9, y + 7);
  pen.closePath();
  pen.fill();
  // Right wing (the same, mirrored)
  pen.beginPath();
  pen.moveTo(x + 4, y);
  pen.lineTo(x + 20, y - 6 + flap);
  pen.lineTo(x + 14, y + 2);
  pen.lineTo(x + 9, y + 7);
  pen.closePath();
  pen.fill();
  // Ears
  pen.beginPath();
  pen.moveTo(x - 6, y - 4); pen.lineTo(x - 4, y - 12); pen.lineTo(x - 1, y - 5);
  pen.moveTo(x + 6, y - 4); pen.lineTo(x + 4, y - 12); pen.lineTo(x + 1, y - 5);
  pen.fill();
  // Body
  pen.beginPath();
  pen.arc(x, y, 8, 0, Math.PI * 2);
  pen.fill();
  // Eyes
  pen.fillStyle = "#ffd23f";
  pen.fillRect(x - 4, y - 3, 3, 3);
  pen.fillRect(x + 1, y - 3, 3, 3);

  // The countdown in the top corner
  if (bat.state === "chasing") {
    pen.fillStyle = "#3d2a17";
    pen.textAlign = "right";
    pen.font = '14px "Press Start 2P", monospace';
    pen.fillText(`BAT ${Math.ceil(bat.timeLeft)}`, canvas.width - 10, 24);
  }
}
