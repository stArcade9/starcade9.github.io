// movie-clock — analogue clock animated with createMovieClip
// Shows: createMovieClip, gotoAndStop, drawGraphicsNode, print, clean 60fps draw

const { circle, cls, line, print, printCentered, screenHeight, screenWidth } = nova64.draw;
const { createMovieClip, gotoAndStop } = nova64.ui;
const { color, ellipse } = nova64.util;

let W = 640,
  H = 360;
let CX = W / 2,
  CY = H / 2;
const RADIUS = 120;

let time = 0; // accumulated real seconds (used as wall-clock starting from now)

// We'll use a MovieClip of 60 frames (one per second of the clock face)
// Each frame label maps to the second number — we jump to the current second.
let secondClip;
let minuteClip;
let hourClip;

// Helper: draw a clock hand from center at angle θ, length l, color c
function _hand(angle, length, color) {
  const cos = Math.cos(angle - Math.PI / 2);
  const sin = Math.sin(angle - Math.PI / 2);
  line(CX - cos * 10, CY - sin * 10, CX + cos * length, CY + sin * length, color);
}

function _makeDialFrames(count, drawFn) {
  // Build frames as draw functions (pass a canvas-drawing fn per frame)
  const frames = [];
  for (let i = 0; i < count; i++) {
    // Frames are functions — each frame we'll call the draw function with index
    frames.push(() => drawFn(i));
  }
  return frames;
}

export function init() {
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
  CX = W / 2;
  CY = H / 2;
  // Build a 60-frame clip for seconds/minutes and 12-frame for hours,
  // using a simple "label" per frame.
  const secLabels = {};
  const minLabels = {};
  const hrLabels = {};

  for (let i = 0; i < 60; i++) secLabels[String(i)] = i;
  for (let i = 0; i < 60; i++) minLabels[String(i)] = i;
  for (let i = 0; i < 12; i++) hrLabels[String(i)] = i;

  // Frames are placeholder strings (we draw the hands procedurally in draw())
  secondClip = createMovieClip(
    Array.from({ length: 60 }, (_, i) => String(i)),
    1, // 1 fps — we advance manually
    { loop: false, autoPlay: false, labels: secLabels }
  );
  minuteClip = createMovieClip(
    Array.from({ length: 60 }, (_, i) => String(i)),
    1,
    { loop: false, autoPlay: false, labels: minLabels }
  );
  hourClip = createMovieClip(
    Array.from({ length: 12 }, (_, i) => String(i)),
    1,
    { loop: false, autoPlay: false, labels: hrLabels }
  );

  // Seed with current browser time
  const now = new Date();
  time = now.getSeconds() + now.getMinutes() * 60 + now.getHours() * 3600;
}

export function update(dt) {
  time += dt;

  const totalSec = Math.floor(time);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60) % 60;
  const hr = Math.floor(totalSec / 3600) % 12;

  gotoAndStop(secondClip, String(sec));
  gotoAndStop(minuteClip, String(min));
  gotoAndStop(hourClip, String(hr));
}

export function draw() {
  cls(0x1a1a2e);

  // Outer ring
  for (let d = 0; d < 360; d += 6) {
    const a = (d * Math.PI) / 180;
    const isMajor = d % 30 === 0;
    const r1 = RADIUS - (isMajor ? 14 : 7);
    const r2 = RADIUS;
    const col = isMajor ? 0xffffff : 0x445566;
    line(
      CX + Math.cos(a) * r1,
      CY + Math.sin(a) * r1,
      CX + Math.cos(a) * r2,
      CY + Math.sin(a) * r2,
      col
    );
  }

  // Clock face circle
  ellipse(CX, CY, RADIUS * 2, RADIUS * 2, 0x334455);
  ellipse(CX, CY, RADIUS * 2 - 4, RADIUS * 2 - 4, 0x223344);

  // Derive exact angles from accumulated time for smooth sub-second interpolation
  const smoothSec = time % 60;
  const smoothMin = (time / 60) % 60;
  const smoothHr = (time / 3600) % 12;

  const secAngle = (smoothSec / 60) * Math.PI * 2;
  const minAngle = (smoothMin / 60) * Math.PI * 2;
  const hrAngle = (smoothHr / 12) * Math.PI * 2;

  // Hour hand
  _hand(hrAngle, RADIUS * 0.5, 0xffffff);
  // Minute hand
  _hand(minAngle, RADIUS * 0.75, 0xaaddff);
  // Second hand
  _hand(secAngle, RADIUS * 0.88, 0xff4444);

  // Center dot
  ellipsefill(CX, CY, 8, 8, 0xff4444);
  ellipsefill(CX, CY, 4, 4, 0xffffff);

  // MovieClip Frame labels as readout
  const secFrame = secondClip.frame;
  const minFrame = minuteClip.frame;
  const hrFrame = hourClip.frame;
  const hh = String(hourClip.frame).padStart(2, '0');
  const mm = String(minuteClip.frame).padStart(2, '0');
  const ss = String(secondClip.frame).padStart(2, '0');

  print('MOVIE CLOCK', 4, 4, 0xffffff);
  printCentered(`${hh}:${mm}:${ss}`, CX, CY + RADIUS + 14, 0xaaddff);
  print('createMovieClip • gotoAndStop • labels', 4, H - 12, 0x778899);
}

// Override built-in line/ellipse: proxy through the stage ctx when available
// (standard api.js line(), ellipsefill(), etc. already exist in the global scope)
