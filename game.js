// =====================================================
//  GAME LOGIC: the rules of the game.
//  How the gecko moves, eating flies, the bat, the
//  sounds, the loops, and the keyboard and touch controls.
//  (Loaded last, after constants.js and drawing.js.)
// =====================================================

// =====================================================
//  THE GECKO
//  The gecko is 3 squares long: head, body and tail.
//  It moves like the snake did (new head in front,
//  remove the tail) but it NEVER grows, so it can't
//  bite itself. Instead, every fly makes it FASTER.
// =====================================================

let gecko;          // the list of 3 squares: head, body, tail
let direction;      // where the gecko is going right now
let nextDirection;  // where the player wants to go next
let started;        // has the player pressed a key yet?
let gameOver;       // did the gecko crash or get caught?
let flies;          // a LIST of flies, each { x, y, angle } in PIXELS, because they fly freely like the bat
let flyTimer;       // seconds until the next fly arrives
let tongue;         // the tongue while it's out: { fly, timeLeft }, or null when it's in the mouth
let score;          // how many flies the gecko has eaten
let level;          // which level we are on
let bat;            // the bat: { x, y, state, timeLeft }, or null when there is no bat
let steps = 0;      // how many moves the gecko made (used to wiggle its legs)
let paused = false; // is the game paused?
let best = loadBest(); // the best score ever, remembered by the browser
let newBest = false;   // did we just beat the best score?
let soundOn = true;    // are sounds switched on?

// Put everything back to the beginning
function resetGame() {
  gecko = [
    { x: 5, y: 10 },   // head
    { x: 4, y: 10 },   // body
    { x: 3, y: 10 },   // tail
  ];
  direction = RIGHT;
  nextDirection = RIGHT;
  started = false;
  gameOver = false;
  score = 0;
  level = 1;
  bat = null;
  paused = false;
  newBest = false;
  flies = [];
  spawnFly();               // start with one fly
  flyTimer = FLY_SPAWN_TIME;
  tongue = null;
  updateStats();
  document.getElementById("pause").textContent = "Pause";
  document.getElementById("info").innerHTML = isTouch
    ? "<b>Tap</b> or <b>swipe</b> the board to start."
    : "Press an <b>arrow key</b> to start. <b>P</b> pauses, <b>M</b> turns sound on or off.";
  draw();
}

// Where will the head be after the next step?
function nextHead() {
  const head = gecko[0];
  return { x: head.x + direction.x, y: head.y + direction.y };
}

// Is this square outside the board?
function isOutside(square) {
  return square.x < 0 || square.x >= GRID_SIZE || square.y < 0 || square.y >= GRID_SIZE;
}

// Move the gecko one square: new head in front, remove the tail. It always stays 3 long.
function moveGecko(newHead) {
  gecko.unshift(newHead);
  gecko.pop();
  steps = steps + 1;
}

// =====================================================
//  FLIES AND LEVELS
// =====================================================

// Add a new fly on a random square that is NOT under the gecko, facing a random way
function spawnFly() {
  let square;
  do {
    square = {
      x: Math.floor(Math.random() * GRID_SIZE),   // a random whole number from 0 to 19
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (isOnGecko(square));   // landed on the gecko? try again

  const center = cellCenter(square);
  flies.push({ x: center.x, y: center.y, angle: Math.random() * Math.PI * 2 });   // angle = which way it flies
}

// Everything about flies, about 60 times a second
function updateFlies(seconds) {
  for (const fly of flies) moveFly(fly, seconds);

  if (started) {
    // New flies: every 3 seconds (if there's room), or right away if there are none left
    flyTimer = flyTimer - seconds;
    if (flyTimer <= 0 || flies.length === 0) {
      if (flies.length < MAX_FLIES) spawnFly();
      flyTimer = FLY_SPAWN_TIME;
    }

    updateTongue(seconds);
    if (tongue === null) tryToCatchAFly();
  }
}

// Move one fly a tiny bit. It wobbles left and right as it goes, and bounces off the edges.
function moveFly(fly, seconds) {
  fly.angle = fly.angle + (Math.random() - 0.5) * 0.4;   // turn a little, randomly
  const speed = Math.min(FLY_SPEED + (level - 1) * FLY_SPEED_PER_LEVEL, FLY_MAX_SPEED);
  fly.x = fly.x + Math.cos(fly.angle) * speed * seconds;
  fly.y = fly.y + Math.sin(fly.angle) * speed * seconds;

  // Bounce off the edges (stay half a square away from the wall)
  const edge = CELL / 2;
  if (fly.x < edge || fly.x > canvas.width - edge) {
    fly.angle = Math.PI - fly.angle;                     // flip left/right
    fly.x = Math.min(Math.max(fly.x, edge), canvas.width - edge);
  }
  if (fly.y < edge || fly.y > canvas.height - edge) {
    fly.angle = -fly.angle;                              // flip up/down
    fly.y = Math.min(Math.max(fly.y, edge), canvas.height - edge);
  }
}

// =====================================================
//  THE TONGUE
//  If a fly is close enough IN FRONT of the gecko,
//  the tongue shoots out, grabs it, and pulls it back.
// =====================================================

function tryToCatchAFly() {
  const head = cellCenter(gecko[0]);
  for (const fly of flies) {
    const dx = fly.x - head.x;
    const dy = fly.y - head.y;
    const inFront = dx * direction.x + dy * direction.y > 0;   // is the fly on the side the gecko is facing?
    const closeEnough = distance(fly, head) < TONGUE_RANGE;
    const touching = distance(fly, head) < CELL * 0.7;         // right next to the head counts too
    if ((inFront && closeEnough) || touching) {
      tongue = { fly: fly, timeLeft: TONGUE_TIME };
      eatFly(fly);
      return;                                                 // one fly at a time!
    }
  }
}

function updateTongue(seconds) {
  if (tongue === null) return;
  tongue.timeLeft = tongue.timeLeft - seconds;
  if (tongue.timeLeft <= 0) tongue = null;                    // tongue is back in the mouth
}

// Is this square covered by any part of the gecko?
function isOnGecko(square) {
  for (const part of gecko) {
    if (part.x === square.x && part.y === square.y) return true;
  }
  return false;
}

function eatFly(fly) {
  flies = flies.filter((other) => other !== fly);   // take this fly out of the list
  score = score + 1;          // more flies = faster gecko (see currentSpeed)
  soundEat();

  // Every 10 flies: next level, and here comes the bat!
  if (score % FLIES_PER_LEVEL === 0) {
    level = level + 1;
    document.getElementById("info").innerHTML = `<b>Level ${level}!</b> <b>A bat is coming!</b> Survive ${BAT_CHASE_TIME} seconds.`;
    soundLevelUp();
    spawnBat();
    soundBat();
  }
  updateStats();
}

// How long to wait between moves: shorter (faster) for every fly eaten
function currentSpeed() {
  const speed = START_SPEED - score * SPEED_UP_PER_FLY;
  return Math.max(speed, FASTEST_SPEED);   // whichever is bigger, so it never goes below FASTEST_SPEED
}

// Show the score, level and best score on the page
function updateStats() {
  document.getElementById("score").textContent = score;
  document.getElementById("level").textContent = level;
  document.getElementById("best").textContent = best;
}

// =====================================================
//  GAME OVER, BEST SCORE AND SOUNDS
// =====================================================

// Every way the game can end comes through here
function endGame(message) {
  gameOver = true;
  soundGameOver();
  if (score > best) {
    best = score;
    newBest = true;
    saveBest();
    updateStats();
    message = message + " <b>New best score!</b>";
    soundLevelUp(1.8);      // a happy tune after the sad one
  }
  document.getElementById("info").innerHTML = message;
}

// Best score: the browser keeps a little note for us (localStorage)
function loadBest() {
  try {
    return Number(localStorage.getItem("gecko-and-bat-best")) || 0;
  } catch (error) {
    return 0;               // some browsers don't allow notes: then we just start at 0
  }
}

function saveBest() {
  try {
    localStorage.setItem("gecko-and-bat-best", best);
  } catch (error) {
    // couldn't save the note: that's OK, the game still works
  }
}

// Sounds: we make them ourselves with the browser's tiny synthesizer
let audio = null;

// Browsers only allow sound after you press a key or click, so we switch it on then
function startAudio() {
  if (audio === null) {
    try { audio = new AudioContext(); } catch (error) { return; }
  }
  if (audio.state === "suspended") audio.resume();
}

// Play one note. freq = how high (in Hz), startIn = wait this many seconds first,
// length = how long, type = the kind of sound wave, endFreq = slide to this pitch
function beep(freq, startIn, length, type = "square", endFreq = freq) {
  if (!soundOn || audio === null) return;
  const start = audio.currentTime + startIn;
  const note = audio.createOscillator();       // makes the sound wave
  const volume = audio.createGain();           // a volume knob
  note.type = type;
  note.frequency.setValueAtTime(freq, start);
  note.frequency.exponentialRampToValueAtTime(endFreq, start + length);
  volume.gain.setValueAtTime(0.12, start);
  volume.gain.exponentialRampToValueAtTime(0.001, start + length);   // fade out
  note.connect(volume).connect(audio.destination);                  // wave -> knob -> speakers
  note.start(start);
  note.stop(start + length);
}

function soundEat()  { beep(300, 0, 0.1, "square", 700); }               // a quick "gulp!"
function soundLevelUp(delay = 0) {                                       // da-da-da-DAA!
  const notes = [523, 659, 784, 1047];
  for (let i = 0; i < notes.length; i++) beep(notes[i], delay + i * 0.1, 0.15);
}
function soundBat() {                                                    // screech, screech!
  beep(1500, 0.5, 0.25, "sawtooth", 500);
  beep(1500, 0.8, 0.25, "sawtooth", 500);
}
function soundPhew() {                                                   // the bat flew away
  beep(500, 0, 0.15, "triangle", 700);
  beep(700, 0.15, 0.25, "triangle", 1000);
}
function soundGameOver() {                                               // wah, wah, wah, waaaah
  const notes = [440, 370, 311];
  for (let i = 0; i < notes.length; i++) beep(notes[i], i * 0.3, 0.28, "triangle");
  beep(262, 0.9, 0.8, "triangle", 200);
}

// =====================================================
//  THE BAT
//  Every new level, a warning mark appears on a random
//  square. Half a second later, the bat pops out there!
//  For 10 seconds it flies straight toward the gecko's
//  head. If it gets there, game over! If time runs out,
//  it flies away. The bat flies freely, so it lives in pixels.
//  The bat's moods (states): "warning" -> "chasing" -> "leaving"
// =====================================================

// Pick a random square (not under the gecko) and show the warning there
function spawnBat() {
  let square;
  do {
    square = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (isOnGecko(square));

  const center = cellCenter(square);
  bat = { x: center.x, y: center.y, state: "warning", warningLeft: BAT_WARNING_TIME, timeLeft: BAT_CHASE_TIME };
}

// How far apart are two points? (Pythagoras: a² + b² = c²)
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// How fast the bat flies, in pixels per second
function batSpeed() {
  const ratio = Math.min(BAT_START_RATIO + (level - 2) * BAT_RATIO_PER_LEVEL, BAT_MAX_RATIO);
  const geckoSquaresPerSecond = 1000 / currentSpeed();
  return ratio * geckoSquaresPerSecond * CELL;
}

// Move the bat a little. "seconds" is how much time passed since last time (a tiny bit, like 0.016)
function updateBat(seconds) {
  if (bat === null) return;   // no bat right now

  if (bat.state === "warning") {
    // Count down the warning. When it's over, the bat appears and starts chasing.
    bat.warningLeft = bat.warningLeft - seconds;
    if (bat.warningLeft <= 0) bat.state = "chasing";
    return;
  }

  if (bat.state === "chasing") {
    bat.timeLeft = bat.timeLeft - seconds;
    if (bat.timeLeft <= 0) {
      bat.state = "leaving";
      soundPhew();
      document.getElementById("info").innerHTML = "Phew! The bat <b>gave up</b> and flew away.";
      return;
    }

    // Fly toward the head: find the direction, then take a small step that way
    const target = cellCenter(gecko[0]);
    const dx = target.x - bat.x;          // how far to go left/right
    const dy = target.y - bat.y;          // how far to go up/down
    const dist = distance(bat, target);
    const step = batSpeed() * seconds;    // how far the bat can fly in this little bit of time
    if (dist > 0) {
      bat.x = bat.x + (dx / dist) * step;
      bat.y = bat.y + (dy / dist) * step;
    }

    // Did it catch the head?
    if (distance(bat, cellCenter(gecko[0])) < CATCH_DISTANCE) {
      endGame("Eek! <b>The bat caught you.</b>");
    }
  } else {
    // Leaving: fly up and away, fast, until it's off the board
    bat.y = bat.y - 300 * seconds;
    if (bat.y < -CELL * 2) bat = null;    // gone!
  }
}

// =====================================================
//  THE LOOPS AND THE KEYBOARD
// =====================================================

// THE ANIMATION LOOP: about 60 times a second, move the bat and redraw.
// (The gecko moves on its own heartbeat, square by square.)
let lastTime = performance.now();
function animationFrame(now) {
  const seconds = Math.min((now - lastTime) / 1000, 0.1);   // time since the last frame
  lastTime = now;
  if (!gameOver && !paused) {
    updateFlies(seconds);
    updateBat(seconds);
  }
  draw();
  requestAnimationFrame(animationFrame);
}

// THE GAME LOOP: check the next square, then move
function gameLoop() {
  if (!started || gameOver || paused) return;   // not started, crashed, or paused: do nothing

  direction = nextDirection;
  const newHead = nextHead();

  if (isOutside(newHead)) {
    endGame("Bonk! The gecko <b>hit the wall</b>.");   // we check BEFORE moving, so the gecko stays on the board
    return;
  }
  moveGecko(newHead);
}

// The heartbeat: run the game loop, then wait (shorter with every fly), then do it again
function heartbeat() {
  gameLoop();
  setTimeout(heartbeat, currentSpeed());
}

// Listen for the keyboard
document.addEventListener("keydown", (event) => {
  if (settingsMenu.open) return;  // typing in the Advanced menu: don't steer the gecko
  startAudio();                   // the first key press switches sound on

  // M: sound on or off (works any time)
  if (event.key === "m" || event.key === "M") {
    toggleSound();
    return;
  }

  // After a crash, SPACE starts a new game and the arrow keys do nothing
  if (gameOver) {
    if (event.key === " ") {
      event.preventDefault();
      resetGame();
    }
    return;
  }

  // P: pause or keep playing
  if (event.key === "p" || event.key === "P") {
    togglePause();
    return;
  }

  let wanted = null;
  if (event.key === "ArrowUp")    wanted = UP;
  if (event.key === "ArrowDown")  wanted = DOWN;
  if (event.key === "ArrowLeft")  wanted = LEFT;
  if (event.key === "ArrowRight") wanted = RIGHT;
  if (wanted === null) return;    // some other key: ignore it

  event.preventDefault();         // stop the arrow keys from scrolling the page
  steer(wanted);
});

// Turn the gecko. The keyboard, swipes and the arrow buttons ALL use this one function.
function steer(wanted) {
  if (gameOver || paused) return;

  // The gecko can't turn straight back into its own body
  const isBackwards = wanted.x === -direction.x && wanted.y === -direction.y;
  if (!isBackwards) nextDirection = wanted;

  if (!started) {
    started = true;
    document.getElementById("info").innerHTML = isTouch
      ? "<b>Swipe</b> or use the <b>arrows</b> to steer. Catch the flies!"
      : "Steer with the <b>arrow keys</b>. Catch the flies!";
  }
}

// Pause or keep playing (only once the game has started, and not after game over)
function togglePause() {
  if (!started || gameOver) return;
  paused = !paused;               // flip the switch: true becomes false, false becomes true
  document.getElementById("pause").textContent = paused ? "Play" : "Pause";
  document.getElementById("info").innerHTML = paused
    ? "Paused. Press <b>P</b> or <b>Play</b> to keep playing."
    : "Catch the flies!";
}

document.getElementById("restart").addEventListener("click", (event) => {
  event.currentTarget.blur();     // so the arrow keys go to the game, not the button
  startAudio();
  resetGame();
});

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById("sound").textContent = soundOn ? "Sound: on" : "Sound: off";
}

document.getElementById("sound").addEventListener("click", (event) => {
  event.currentTarget.blur();
  startAudio();
  toggleSound();
});

document.getElementById("pause").addEventListener("click", (event) => {
  event.currentTarget.blur();
  togglePause();
});

// =====================================================
//  THE ADVANCED MENU
//  Lets you change some of the settings from constants.js
//  while playing. Each one knows how to read (get) and
//  change (set) its setting. "scale" shows a number in
//  nicer units, like 0.7 as 70%.
// =====================================================

const SETTINGS = [
  { label: "Max gecko speed", hint: "ms between moves at its fastest (smaller = faster)", min: 20, max: 500, step: 5,
    get: () => FASTEST_SPEED, set: (value) => FASTEST_SPEED = value },
  { label: "Start gecko speed", hint: "ms between moves at the start (smaller = faster)", min: 20, max: 500, step: 5,
    get: () => START_SPEED, set: (value) => START_SPEED = value },
  { label: "Speed up per fly", hint: "ms faster for every fly eaten", min: 0, max: 20, step: 0.5,
    get: () => SPEED_UP_PER_FLY, set: (value) => SPEED_UP_PER_FLY = value },
  { label: "Max bat speed", hint: "% of the gecko's speed at its fastest", min: 0, max: 200, step: 5, scale: 100,
    get: () => BAT_MAX_RATIO, set: (value) => BAT_MAX_RATIO = value },
  { label: "Start bat speed", hint: "% of the gecko's speed on level 2", min: 0, max: 200, step: 5, scale: 100,
    get: () => BAT_START_RATIO, set: (value) => BAT_START_RATIO = value },
  { label: "Bat chase time", hint: "seconds the bat chases you", min: 1, max: 60, step: 1,
    get: () => BAT_CHASE_TIME, set: (value) => BAT_CHASE_TIME = value },
  { label: "Flies per level", hint: "flies to eat before the next level (and bat)", min: 1, max: 50, step: 1,
    get: () => FLIES_PER_LEVEL, set: (value) => FLIES_PER_LEVEL = value },
  { label: "Max flies", hint: "flies buzzing around at once", min: 1, max: 20, step: 1,
    get: () => MAX_FLIES, set: (value) => MAX_FLIES = value },
  { label: "Start fly speed", hint: "pixels per second on level 1", min: 0, max: 300, step: 5,
    get: () => FLY_SPEED, set: (value) => FLY_SPEED = value },
  { label: "Max fly speed", hint: "pixels per second at the fastest", min: 0, max: 300, step: 5,
    get: () => FLY_MAX_SPEED, set: (value) => FLY_MAX_SPEED = value },
];
const DEFAULTS = SETTINGS.map((setting) => setting.get());   // remember the normal values for "Reset to normal"

const settingsMenu = document.getElementById("settings");
const settingsList = document.getElementById("settings-list");
let pausedForMenu = false;   // did opening the menu pause the game? then closing it un-pauses

// Make one row (label + number box) for every setting
SETTINGS.forEach((setting, i) => {
  const scale = setting.scale || 1;
  const row = document.createElement("div");
  row.className = "setting";
  row.innerHTML = `<label for="setting-${i}">${setting.label}<small>${setting.hint}</small></label>
    <input type="number" id="setting-${i}" min="${setting.min}" max="${setting.max}" step="${setting.step}">`;
  const input = row.querySelector("input");
  input.addEventListener("input", () => {
    const value = Number(input.value);
    if (input.value === "" || Number.isNaN(value)) return;                   // half-typed: wait
    const safe = Math.min(Math.max(value, setting.min), setting.max);      // keep it between min and max
    setting.set(safe / scale);
  });
  input.addEventListener("change", () => showSettings());   // when you leave the box, show the value really used
  settingsList.appendChild(row);
});

// Put the current values into the number boxes
function showSettings() {
  SETTINGS.forEach((setting, i) => {
    const scale = setting.scale || 1;
    document.getElementById(`setting-${i}`).value = Math.round(setting.get() * scale * 100) / 100;
  });
}

document.getElementById("advanced").addEventListener("click", (event) => {
  event.currentTarget.blur();
  pausedForMenu = started && !gameOver && !paused;
  if (pausedForMenu) togglePause();
  showSettings();
  settingsMenu.showModal();
});

document.getElementById("settings-reset").addEventListener("click", () => {
  SETTINGS.forEach((setting, i) => setting.set(DEFAULTS[i]));
  showSettings();
});

// "Done", or the Escape key: close the menu and keep playing
settingsMenu.addEventListener("close", () => {
  if (pausedForMenu && paused) togglePause();
  pausedForMenu = false;
});

// =====================================================
//  TOUCH CONTROLS (phones and tablets)
//  1. Swipe on the board: the way you swipe is the way the gecko turns
//  2. Tap the board: start the game, or play again after game over
//  3. The arrow buttons under the board
// =====================================================

let touchStart = null;       // where the finger touched down: { x, y, swiped }

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();    // no scrolling or zooming while playing
  startAudio();
  const finger = event.changedTouches[0];
  touchStart = { x: finger.clientX, y: finger.clientY, swiped: false };
}, { passive: false });

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  if (touchStart === null) return;
  const finger = event.changedTouches[0];
  const dx = finger.clientX - touchStart.x;   // how far the finger moved left/right
  const dy = finger.clientY - touchStart.y;   // how far it moved up/down
  if (Math.abs(dx) < SWIPE_DISTANCE && Math.abs(dy) < SWIPE_DISTANCE) return;   // not far enough yet

  // Whichever way the finger moved MORE wins
  if (Math.abs(dx) > Math.abs(dy)) {
    steer(dx > 0 ? RIGHT : LEFT);
  } else {
    steer(dy > 0 ? DOWN : UP);
  }
  // Start measuring again from here, so you can keep swiping without lifting your finger
  touchStart = { x: finger.clientX, y: finger.clientY, swiped: true };
}, { passive: false });

canvas.addEventListener("touchend", (event) => {
  event.preventDefault();
  if (touchStart === null) return;
  const wasTap = !touchStart.swiped;
  touchStart = null;
  if (!wasTap) return;

  // A tap (no swipe): start the game, or play again after game over
  if (gameOver) resetGame();
  else if (!started) steer(direction);   // start moving the way the gecko is already facing
}, { passive: false });

// The arrow buttons: each one has data-dir="up", "down", "left" or "right"
for (const button of document.querySelectorAll("#pad button")) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();  // react instantly, and no double-tap zoom
    startAudio();
    steer(DIRECTION_NAMES[button.dataset.dir]);
  });
}

// Start!
resetGame();
heartbeat();
requestAnimationFrame(animationFrame);
