// tv-demo — a 3D television playing video as an IN-WORLD texture.
//
// One code path, three backends, via nova64.video.loadTexture(url).applyToMesh():
//   Web       — THREE/BABYLON VideoTexture on the screen mesh (auto-updates).
//   RetroArch — MPEG1 (.mpg) decoded in-core to a GLES texture, re-uploaded each
//               frame; the cart pumps it with handle.update(dt).
//   Godot     — native in-world video texture is a follow-up (falls back cleanly).
//
// See docs/VIDEO_GUIDE.md. Transcode assets with scripts/transcode-video.py.
// Open: http://localhost:3000/console.html?demo=tv-demo

let tv = null; // video-texture handle from nova64.video.loadTexture
let screenMesh = 0;
let t = 0;

export function init() {
  nova64.camera.setCameraPosition(0, 0.7, 5.5);
  nova64.camera.setCameraTarget(0, 0.6, 0);
  if (nova64.camera.setCameraFOV) nova64.camera.setCameraFOV(55);
  if (nova64.light.setLightDirection) nova64.light.setLightDirection(-0.3, -0.7, -0.5);
  if (nova64.light.setAmbient) nova64.light.setAmbient(0x404055);

  // TV bezel (dark box) the screen sits inside, plus a little stand.
  const bezel = nova64.scene.createCube(1, 0x0a0a12, [0, 0.6, -0.08]);
  nova64.scene.setScale(bezel, 3.7, 2.3, 0.25);
  const stand = nova64.scene.createCube(1, 0x141420, [0, -0.65, 0]);
  nova64.scene.setScale(stand, 0.7, 0.7, 0.7);

  // The screen: a thin box whose front face shows the video. Face UVs map each
  // face 0..1 so the whole frame lands on the front (the proven textured path).
  screenMesh = nova64.scene.createCube(1, 0xffffff, [0, 0.6, 0.06]);
  nova64.scene.setScale(screenMesh, 3.2, 1.8, 0.05);
  if (nova64.scene.setMeshFaceUVs) nova64.scene.setMeshFaceUVs(screenMesh, true);

  // Ground for a touch of depth.
  const ground = nova64.scene.createPlane(24, 24, 0x161624, [0, -1.0, 0]);
  if (nova64.scene.setRotation) nova64.scene.setRotation(ground, -Math.PI / 2, 0, 0);

  if (nova64.video && nova64.video.loadTexture) {
    tv = nova64.video.loadTexture('/assets/sample.mp4', {
      nativeUrl: 'assets/video/sample.ogv', // Godot
      mpgUrl: 'assets/video/sample.mpg', // RetroArch
      muted: false,
      loop: true,
    });
    if (tv && tv.applyToMesh) tv.applyToMesh(screenMesh);
  }
}

export function update(dt) {
  t += dt;
  // Native hosts decode + re-upload the next frame here; on web update() is a
  // no-op (the VideoTexture refreshes itself from the render loop).
  if (tv && typeof tv.update === 'function') tv.update(dt);

  // Slow showroom orbit around the set.
  const a = Math.sin(t * 0.25) * 0.7;
  nova64.camera.setCameraPosition(Math.sin(a) * 5.5, 0.9, Math.cos(a) * 5.5);
  nova64.camera.setCameraTarget(0, 0.6, 0);
}

export function draw() {
  nova64.draw.print('NOVA64 TV  -  in-world video texture', 8, 8, 0x66ffcc, 1);
  if (tv && tv.ok === false) {
    nova64.draw.print('video unavailable: ' + (tv.error || ''), 8, 22, 0xff8888, 1);
  }
}
