// =====================================================
//  CONSTANTS: all the game's settings in one place.
//  Change these numbers to make the game easier or harder!
//  (This file is loaded FIRST, so the other files can use these.)
//  The ones made with "let" can also be changed while playing,
//  with the Advanced button under the board.
// =====================================================

// --- The board ---
// The game happens on a square grid, like graph paper. Every square has an
// address: x (left to right) and y (top to bottom). Counting starts at 0.
const GRID_SIZE = 20;   // the board is 20 squares wide and 20 squares tall
const CELL = 24;        // each square is 24 pixels big (20 x 24 = 480 pixels)

// --- The gecko and the flies ---
// Speed settings. The gecko moves once every so many milliseconds (1000 = 1 second).
// A SMALLER number means FASTER.
let START_SPEED = 150;      // speed at the start
let SPEED_UP_PER_FLY = 1.5; // every fly, the gecko waits 1.5 ms less between moves
let FASTEST_SPEED = 70;     // it never gets faster than this
let FLIES_PER_LEVEL = 10;   // a new level (and a bat!) every 10 flies
let FLY_SPEED = 20;         // on level 1 the fly buzzes around slowly: 20 pixels per second (less than a square)
const FLY_SPEED_PER_LEVEL = 6; // each new level, flies get 6 pixels per second faster
let FLY_MAX_SPEED = 50;     // but never faster than this
const FLY_SPAWN_TIME = 3;     // a new fly arrives every 3 seconds...
let MAX_FLIES = 5;          // ...until there are 5 flies buzzing around
const TONGUE_RANGE = CELL * 2; // the tongue reaches 2 squares in front of the gecko
const TONGUE_TIME = 0.2;      // the tongue shoots out and back in 0.2 seconds

// --- The bat ---
let BAT_CHASE_TIME = 10;        // the bat chases you for 10 seconds
const BAT_WARNING_TIME = 0.5;     // a warning mark shows on the bat's square half a second before it appears
let BAT_START_RATIO = 0.55;     // on level 2 the bat flies at 55% of the gecko's speed
const BAT_RATIO_PER_LEVEL = 0.04; // each level it gets 4% closer to the gecko's speed
let BAT_MAX_RATIO = 0.7;        // but never faster than 70% of the gecko
const CATCH_DISTANCE = CELL * 0.7; // this close to the head = caught!

// --- Controls ---
// Is this a phone or tablet (a touch screen)? Then we show touch controls and touch hints.
const isTouch = window.matchMedia("(pointer: coarse)").matches;

// Directions: how much x and y change in one step
const UP    = { x: 0,  y: -1 };
const DOWN  = { x: 0,  y: 1 };
const LEFT  = { x: -1, y: 0 };
const RIGHT = { x: 1,  y: 0 };
const DIRECTION_NAMES = { up: UP, down: DOWN, left: LEFT, right: RIGHT };   // for the on-screen arrow buttons

// --- Colors ---
const GECKO_GREEN = "#4caf50";
const GECKO_DARK = "#2e7d32";

// --- Touch controls ---
const SWIPE_DISTANCE = 20;   // the finger must move at least 20 pixels to count as a swipe
