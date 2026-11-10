// story-video-demo — a short slide story that ends with a fullscreen video.
//
// Real video on every backend: Web plays the MP4 via HTML5 <video>, Godot plays
// the native OGV (Theora) asset, and RetroArch decodes the MPEG1 .mpg in-core
// via pl_mpeg. All three are driven through nova64.video.playFullscreen.
//
// Open: http://localhost:3000/console.html?demo=story-video-demo
//
// The story auto-advances hands-free; then the outro video plays fullscreen
// (public-domain "Big Buck Bunny" clip), and the cart shows "THE END". Press
// Enter to advance slides manually, Escape/Enter to skip the video.

let screen = 'story';
let outroStarted = false;
let storyIndex = 0;
let storyTimer = 0;
let videoElapsed = 0;
let videoError = '';
const textureHandles = new Map();

const SLIDES = [
  {
    image: '/assets/novaOS/novaMascot.png',
    nativeImage: 'assets/story/novaMascot.png',
    text: 'NOVA64 // a short tale before the show.',
    prompt: 'Enter — or just wait',
  },
  {
    image: '/assets/novaOS/novaMascot.png',
    nativeImage: 'assets/story/novaMascot.png',
    text: 'Our hero reaches the final gate.',
    prompt: 'Enter — or just wait',
  },
  {
    image: '/assets/novaOS/novaMascot.png',
    nativeImage: 'assets/story/novaMascot.png',
    text: 'Beyond it waits a vision. Roll the tape…',
    prompt: 'Enter to play the outro',
  },
];

export function init() {
  runStory();
}

function runStory() {
  screen = 'story';
  outroStarted = false;
  storyIndex = 0;
  storyTimer = 0;
  if (!hasStoryHelper()) return;
  nova64.story
    .play(SLIDES, {
      transition: 'pixel-melt',
      autoAdvance: 3.0, // hands-free: advance every 3s (Enter still works)
      onFinish: () => {
        playOutro();
      },
    })
    .then(({ finished }) => {
      if (finished) playOutro();
    });
}

function playOutro() {
  if (outroStarted) return;
  outroStarted = true;
  screen = 'video';
  videoElapsed = 0;
  videoError = '';
  if (!hasVideoHelper()) {
    videoError = 'no video support on this host';
    screen = 'video-error';
    return;
  }
  nova64.video
    .playFullscreen('/assets/sample.mp4', {
      nativeUrl: 'assets/video/sample.ogv', // Godot: native Theora
      mpgUrl: 'assets/video/sample.mpg', // RetroArch: MPEG1 decoded by pl_mpeg
      muted: false,
      onFinish: () => {
        screen = 'done';
      },
    })
    .then(result => {
      if (result && result.error) {
        videoError = result.message || 'video failed';
        screen = 'video-error';
      } else {
        screen = 'done';
      }
    });
}

export function update(dt) {
  // Drive the story helper so transitions animate and autoAdvance fires.
  if (screen === 'story') {
    if (hasStoryHelper()) {
      if (typeof nova64.story._tick === 'function') nova64.story._tick(dt);
    } else {
      updateLocalStory(dt);
    }
  }
  if (screen === 'video') {
    if (hasVideoHelper()) {
      if (typeof nova64.video._tick === 'function') nova64.video._tick(dt);
    } else {
      updateLocalVideo(dt);
    }
  }
}

export function draw() {
  // story.play() paints its own overlay. Web video also paints its own overlay;
  // native hosts expose _draw() for their framebuffer fallbacks.
  if (screen === 'story') {
    if (hasStoryHelper() && typeof nova64.story._draw === 'function' && nova64.story._draw())
      return;
    drawLocalStory();
    return;
  }
  if (screen === 'video') {
    if (hasVideoHelper() && typeof nova64.video._draw === 'function' && nova64.video._draw())
      return;
    drawLocalVideo();
    return;
  }
  if (screen === 'video-error') {
    drawVideoError();
    return;
  }
  const W = nova64.draw.screenWidth();
  const H = nova64.draw.screenHeight();
  nova64.draw.rectfill(0, 0, W, H, 0x05030fff);
  nova64.draw.print('THE END', W / 2 - 30, H / 2 - 8, 0xffffff, 2);
  nova64.draw.print('story -> video demo', 8, H - 14, 0x4488aa, 1);
}

function hasStoryHelper() {
  return !!(nova64.story && typeof nova64.story.play === 'function');
}

function hasVideoHelper() {
  return !!(nova64.video && typeof nova64.video.playFullscreen === 'function');
}

function pressed(...codes) {
  const keyp = nova64.input && nova64.input.keyp;
  return typeof keyp === 'function' && codes.some(code => keyp(code));
}

function pressedButton(index) {
  return !!(nova64.input && typeof nova64.input.btnp === 'function' && nova64.input.btnp(index));
}

function updateLocalStory(dt) {
  if (pressed('Enter', 'Space') || pressedButton(0)) {
    advanceLocalStory();
    return;
  }
  storyTimer += dt;
  if (storyTimer >= 3.0) advanceLocalStory();
}

function advanceLocalStory() {
  storyTimer = 0;
  if (storyIndex >= SLIDES.length - 1) playOutro();
  else storyIndex += 1;
}

// Fallback for a host with no nova64.video helper at all. Shows a short notice
// instead of the outro, then moves on — no frame-sequence animation.
function updateLocalVideo(dt) {
  if (pressed('Escape', 'Enter', 'Space') || pressedButton(0)) {
    screen = 'done';
    return;
  }
  videoElapsed += dt;
  if (videoElapsed >= 3) screen = 'done';
}

function drawLocalStory() {
  const W = nova64.draw.screenWidth();
  const H = nova64.draw.screenHeight();
  const slide = SLIDES[Math.min(storyIndex, SLIDES.length - 1)];
  nova64.draw.rectfill(0, 0, W, H, 0x05030fff);
  nova64.draw.rect(18, 24, W - 36, H - 72, 0x22ccff, false);
  drawSlideImage(slide, W, H);
  nova64.draw.print('NOVA64 STORY', 36, 42, 0x66ffcc, 2);
  if (typeof nova64.draw.drawTextBox === 'function') {
    nova64.draw.drawTextBox(slide.text, 36, H - 112, W - 72, 56, 0xffffff, 12, { fit: true });
  } else {
    nova64.draw.print(slide.text, 36, H - 96, 0xffffff, 1);
  }
  nova64.draw.print('Enter / Space', 36, H - 32, 0x6688aa, 1);
}

function drawSlideImage(slide, W, H) {
  if (!slide) return;
  const imagePath = slide.nativeImage || slide.image;
  const handle = loadTexture(imagePath);
  if (!handle || typeof nova64.draw.image !== 'function') return;
  const boxW = Math.min(220, W - 72);
  const boxH = Math.min(132, H - 180);
  const x = Math.floor((W - boxW) / 2);
  const y = 78;
  nova64.draw.rectfill(x - 3, y - 3, boxW + 6, boxH + 6, 0x101828ff);
  nova64.draw.image(handle, x, y, boxW, boxH, 0xffffffff);
}

function drawLocalVideo() {
  const W = nova64.draw.screenWidth();
  const H = nova64.draw.screenHeight();
  nova64.draw.rectfill(0, 0, W, H, 0x000000ff);
  nova64.draw.print('VIDEO NOT SUPPORTED ON THIS HOST', 32, H / 2 - 8, 0x888888, 1);
}

// Shown whenever playback can't start (no codec, missing/corrupt asset, no
// host video support). Never leaves the user on a blank screen.
function drawVideoError() {
  const W = nova64.draw.screenWidth();
  const H = nova64.draw.screenHeight();
  nova64.draw.rectfill(0, 0, W, H, 0x200808ff);
  nova64.draw.print('VIDEO UNAVAILABLE', 32, H / 2 - 24, 0xffdddd, 2);
  nova64.draw.print(videoError || 'playback failed', 32, H / 2 + 4, 0xffffff, 1);
  nova64.draw.print('Press Enter to continue', 32, H / 2 + 22, 0xffaaaa, 1);
  if (pressed('Escape', 'Enter', 'Space') || pressedButton(0)) screen = 'done';
}

function loadTexture(path) {
  if (!path || !nova64.scene || typeof nova64.scene.loadTexture !== 'function') return 0;
  if (!textureHandles.has(path)) textureHandles.set(path, nova64.scene.loadTexture(path));
  return textureHandles.get(path);
}

// Dev hooks: replay the story or jump straight to the video from the console.
globalThis.__STORY_VIDEO_DEBUG = { replayStory: runStory, playVideo: playOutro };
