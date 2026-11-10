// The Spillway. Original closed course; coordinates are metres, Y is elevation.
const anchors = [
  [0, 8, 0],
  [0, 8, -140],
  [25, 10, -245],
  [120, 14, -305],
  [230, 14, -265],
  [260, 12, -180],
  [210, 12, -125],
  [265, 15, -65],
  [270, 29, 25],
  [230, 32, 95],
  [170, 12, 155],
  [70, 6, 170],
  [-35, 6, 145],
  [-85, 8, 90],
  [-65, 8, 35],
  [-15, 8, 55],
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (v, n) => ((v % n) + n) % n;
export const STEP = 1 / 120;
export const course = [];
let distance = 0;
for (let i = 0; i < anchors.length; i++) {
  for (let j = 0; j < 24; j++) {
    const t = j / 24;
    const p = [0, 1, 2].map(axis => {
      const a = anchors[wrap(i - 1, anchors.length)][axis];
      const b = anchors[i][axis],
        c = anchors[(i + 1) % anchors.length][axis];
      const d = anchors[(i + 2) % anchors.length][axis];
      return (
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t * t +
          (-a + 3 * b - 3 * c + d) * t * t * t)
      );
    });
    if (course.length) distance += Math.hypot(p[0] - course.at(-1).x, p[2] - course.at(-1).z);
    course.push({ x: p[0], y: p[1], z: p[2], s: distance });
  }
}
export const LENGTH =
  distance + Math.hypot(course.at(-1).x - course[0].x, course.at(-1).z - course[0].z);
export function sample(s) {
  s = wrap(s, LENGTH);
  let lo = 0,
    hi = course.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (course[mid].s <= s) lo = mid;
    else hi = mid - 1;
  }
  const a = course[lo],
    b = course[(lo + 1) % course.length];
  const len = (b.s || LENGTH) - a.s,
    t = (s - a.s) / len;
  const tx = (b.x - a.x) / len,
    tz = (b.z - a.z) / len;
  const bank =
    s > LENGTH * 0.13 && s < LENGTH * 0.34
      ? -0.14 * Math.sin(((s / LENGTH - 0.13) / 0.21) * Math.PI)
      : 0;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    tx,
    tz,
    yaw: Math.atan2(-tx, -tz),
    pitch: Math.atan2(b.y - a.y, len),
    bank,
    width: s < 150 ? 24 : 20,
  };
}
export function curvature(s) {
  const a = sample(s - 4),
    b = sample(s + 4);
  return Math.atan2(a.tx * b.tz - a.tz * b.tx, a.tx * b.tx + a.tz * b.tz) / 8;
}
export const sectors = [
  { name: '01 / CUSTOMS STRAIGHT', start: 0, end: 0.13 },
  { name: '02 / GANTRY SWEEPER', start: 0.13, end: 0.36, slip: true },
  { name: '03 / CONTAINER CHICANE', start: 0.36, end: 0.53, slip: true },
  { name: '04 / SEAWALL DROP', start: 0.53, end: 0.77 },
  { name: '05 / LIGHTHOUSE HAIRPIN', start: 0.77, end: 1, slip: true },
];
export const pads = [0.08, 0.46, 0.72];
export function newCraft(s = 0, lane = 0) {
  return {
    s,
    lane,
    speed: 0,
    heading: 0,
    slip: 0,
    hover: 1.4,
    hoverV: 0,
    time: 0,
    lap: 0,
    nextGate: 1,
    checkpoint: 0,
    charge: 0,
    boost: 0,
    penalty: 0,
    notice: '',
    noticeTime: 0,
    hit: 0,
    sector: 0,
    clean: true,
    sectorDistance: 0,
    sectorSpeed: 0,
    awarded: new Set(),
    padPass: new Set(),
    finished: false,
  };
}
function announce(p, text) {
  p.notice = text;
  p.noticeTime = 2.3;
}
export function recover(p) {
  p.s = p.checkpoint + 0.1;
  p.lane = 0;
  p.heading = 0;
  p.slip = 0;
  p.speed = 0;
  p.boost = 0;
  p.penalty += 3;
  p.time += 3;
  p.clean = false;
  announce(p, 'RECOVERY  +3.00s');
}
// Validate ordered physical crossings. Teleports, reversing and wide misses never advance gates.
export function crossGates(p, from, to, lane) {
  if (to <= from || to - from > 4 || Math.abs(lane) > sample(to).width / 2 - 1) return;
  const gate = (p.nextGate * LENGTH) / 8;
  if (from < gate && to >= gate) {
    p.checkpoint = gate;
    p.nextGate++;
    if (p.nextGate % 8 === 1) {
      p.lap++;
      announce(p, 'LAP ' + Math.min(3, p.lap + 1));
      if (p.lap === 3) p.finished = true;
    }
  }
}
export function step(p, input, dt = STEP) {
  if (p.finished) return;
  p.time += dt;
  p.hit = Math.max(0, p.hit - dt);
  p.noticeTime = Math.max(0, p.noticeTime - dt);
  if (input.recover) {
    recover(p);
    return;
  }
  const road = sample(p.s),
    bend = curvature(p.s);
  const brake = (input.leftBrake ? 1 : 0) + (input.rightBrake ? 1 : 0);
  if (input.boost && p.charge >= 1 && p.boost <= 0) {
    p.charge = 0;
    p.boost = 1.7;
    p.speed = Math.min(112, p.speed + 32);
    announce(p, 'SLIP BOOST');
  }
  p.boost = Math.max(0, p.boost - dt);
  const cap = p.boost > 0 ? 112 : 80;
  p.speed = clamp(
    p.speed +
      ((input.throttle ? 44 : 0) - p.speed * 0.42 - brake * 17 - (input.brake ? 48 : 0)) * dt,
    0,
    cap
  );
  const steer = clamp(input.steer || 0, -1, 1);
  const yaw =
    steer * (1.4 - p.speed * 0.005) +
    (Number(!!input.rightBrake) - Number(!!input.leftBrake)) * 0.75;
  p.heading += (yaw - bend * p.speed * Math.cos(p.heading) - p.heading * 0.55) * dt;
  p.heading = clamp(p.heading, -2.6, 2.6);
  const desired = Math.sin(p.heading) * p.speed;
  p.slip += (desired - p.slip) * Math.min(1, dt * (brake ? 9 : 4.5));
  p.lane += p.slip * dt;
  const from = p.s;
  p.s += p.speed * Math.cos(p.heading) * dt;
  if (Math.abs(p.lane) > road.width / 2 + 7) {
    recover(p);
    return;
  }
  const wall = road.width / 2 - 1.25;
  if (Math.abs(p.lane) > wall) {
    const heavy = Math.abs(p.slip) > 18;
    p.lane = Math.sign(p.lane) * wall;
    p.slip *= -0.22;
    p.heading *= 0.65;
    p.clean = false;
    if (p.hit === 0) {
      p.speed *= heavy ? 0.28 : 0.78;
      p.hit = 0.25;
      announce(p, heavy ? 'HEAVY CONTACT' : 'WALL SCRAPE');
    }
  }
  const target = 1.4 + Math.sin(p.time * 7) * 0.1;
  p.hoverV += ((target - p.hover) * 45 - p.hoverV * 10) * dt;
  p.hover += p.hoverV * dt;
  crossGates(p, from, p.s, p.lane);
  const f = wrap(p.s, LENGTH) / LENGTH;
  const si = sectors.findIndex(s => f >= s.start && f < s.end);
  if (si !== p.sector) {
    const old = sectors[p.sector],
      key = Math.floor(from / LENGTH) + ':' + p.sector;
    if (
      old.slip &&
      p.clean &&
      p.sectorDistance > (old.end - old.start) * LENGTH * 0.85 &&
      p.sectorSpeed / Math.max(0.01, p.sectorDistance) > 42 &&
      Math.abs(p.heading) < 0.32 &&
      !p.awarded.has(key)
    ) {
      p.charge = Math.min(1, p.charge + 0.5);
      p.awarded.add(key);
      announce(p, 'CLEAN EXIT  +50% SLIP');
    }
    p.sector = si;
    p.clean = true;
    p.sectorDistance = 0;
    p.sectorSpeed = 0;
  }
  const ds = Math.max(0, p.s - from);
  p.sectorDistance += ds;
  p.sectorSpeed += ds * p.speed;
  for (let i = 0; i < pads.length; i++) {
    const gate = (Math.floor(from / LENGTH) + pads[i]) * LENGTH,
      key = Math.floor(from / LENGTH) + ':' + i;
    if (from < gate && p.s >= gate && Math.abs(p.lane) < 3 && !p.padPass.has(key)) {
      p.speed = Math.min(115, p.speed + 25);
      p.boost = Math.max(p.boost, 0.55);
      p.padPass.add(key);
      announce(p, 'STRIP KICK');
    }
  }
}
export function aiInput(p, index = 0) {
  const lane = index === 0 ? 0 : (index % 2 ? -1 : 1) * (2.4 + Math.floor(index / 2) * 0.45);
  const k = curvature(p.s + 8);
  const target = clamp(80 - Math.abs(k) * 300 - index * 1.2, 34, 80);
  const steer = clamp(
    (k * p.speed) / Math.max(0.7, 1.4 - p.speed * 0.005) -
      p.heading * 2 -
      (p.lane - lane) * 0.09 -
      p.slip * 0.025,
    -1,
    1
  );
  return {
    throttle: p.speed < target,
    brake: p.speed > target + 6,
    steer,
    leftBrake: steer < -0.85,
    rightBrake: steer > 0.85,
    boost: p.charge >= 1 && Math.abs(k) < 0.004,
  };
}
