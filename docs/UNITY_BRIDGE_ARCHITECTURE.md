# Unity Bridge Architecture

## Purpose

Nova64's Unity bridge exists to let Nova64-authored JavaScript game code drive native Unity behavior implemented in C#.

The bridge is intentionally designed as a controlled host API, not as an arbitrary C# execution tunnel.

That distinction is the core architectural decision.

## Product Direction

The target outcome is:

- Write game logic in Nova64 JavaScript.
- Execute rendering, input, audio, lifecycle, packaging, and platform integration natively in Unity C#.
- Ship to iOS and Android through Unity's native export pipeline.

This is primarily a mobile-game strategy, not a general-purpose language bridge.

## Non-Goals

The bridge should not:

- expose arbitrary C# evaluation from JavaScript
- mirror the entire Unity object graph into JS
- allow unrestricted access to all Unity APIs
- depend on reflection-heavy or stringly typed ad hoc calls for normal gameplay

If a project needs custom native behaviors, those should be explicitly registered as trusted extension points.

## Core Model

The recommended runtime model is:

1. Nova64 JS owns high-level game logic.
2. JS emits commands into a narrow bridge API.
3. Unity C# owns native execution and platform-facing systems.
4. Unity returns plain data or opaque handles.

In practice, this means JS asks for operations like mesh creation, transform updates, input state, and audio playback, while Unity performs those operations natively.

## Why This Boundary Matters

For mobile games, the controlled-bridge approach is the right tradeoff because it improves:

- security: no arbitrary native code execution path from cart code
- performance: batched commands are cheaper than chatty JS-to-C# RPC
- determinism: gameplay-facing APIs stay explicit and testable
- portability: the same cart-facing API can target other hosts later
- tooling: Unity remains the authoritative owner of native systems

## Recommended Bridge Shape

The bridge should be:

- handle-based
- command-buffered
- whitelist-driven
- frame-oriented
- data-oriented

### Handle-Based

Resources such as meshes, materials, textures, cameras, and audio sources should be represented as opaque IDs or handles when they cross the boundary.

JS should not hold live Unity objects.

### Command-Buffered

JS should enqueue commands during update work, and the host should flush and execute them in a predictable phase.

This avoids excessive per-call overhead and keeps mobile frame times stable.

### Whitelist-Driven

Only approved host methods should be callable. The bridge should expose a deliberate contract, not a raw scripting backdoor.

### Frame-Oriented

Operations should align with a frame lifecycle such as:

1. poll input
2. run JS update
3. flush command buffer
4. execute native render/audio/physics work

### Data-Oriented

Payloads should be plain JSON-like structures or binary payloads where needed. Avoid graph synchronization and runtime object proxying.

## Current Nova64 Seam

Nova64 already has a natural seam for this work in the engine adapter.

Current implementation points:

- `runtime/engine-adapter.js`
- `createUnityBridgeAdapter(bridge, options)`
- `installUnityBridge(bridge, options)`
- `resetEngineAdapter()`

Current host-oriented method names supported by the adapter:

- `material.create`
- `texture.createData`
- `texture.createCanvas`
- `texture.clone`
- `texture.setRepeat`
- `texture.invalidate`
- `geometry.createPlane`
- `mesh.setMaterial`
- `camera.getPosition`

Current supported transport shapes:

- `call(method, payload)`
- `invoke(method, payload)`
- `send(message)`
- `postMessage(message)`

This is a first slice, not the complete Unity runtime surface.

## Recommended Phases

### Phase 1: Native Host Backbone

Build the minimum Unity host that can:

- receive bridge commands
- allocate and track handles
- create materials and textures
- create a plane geometry or equivalent primitive path
- return camera position
- log and validate all incoming commands

This phase proves transport, marshaling, and lifecycle.

### Phase 2: Gameplay-Critical Surface

Add the APIs needed for real mobile games:

- transforms
- mesh creation primitives
- camera control
- input polling
- audio playback
- scene object visibility/state updates

This phase should focus on the smallest feature set required to ship a simple game.

### Phase 3: Asset and Content Pipeline

Add:

- prefab/asset loading
- animation hooks
- particles
- UI integration
- persistence
- mobile platform services if needed

### Phase 4: Trusted Extension Points

If studio users need custom native behavior, expose explicit registered bridge endpoints in C#.

Do not add arbitrary C# execution.

## Mobile-Specific Advice

For iOS and Android, this approach is viable and strong if the bridge stays disciplined.

The main risks are:

- too many cross-boundary calls per frame
- GC churn from small transient messages
- broad API surface too early
- hard-to-debug runtime ownership between JS and Unity

The mitigation is to keep the first versions small, measured, and batch-friendly.

## Decision Summary

Nova64 should treat Unity as a native host backend, not as a general C# execution target.

That means:

- JS authors write Nova64 gameplay code.
- Unity executes native rendering and platform logic in C#.
- The bridge exposes a controlled, versioned host API.
- Custom native capabilities are added as explicit extension points.

This is the architecture most likely to succeed for mobile game shipping.
