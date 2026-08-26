# Build a Token-Based Chapter Experience with Nova64

Build a production-ready mobile web experience using Nova64, Next.js, GitHub and Vercel.

The experience is entered through a permanent QR code containing a unique opaque token:

```text
https://s.starcade9.io/x/[token]
```

The QR code is only the doorway. Once the experience loads, do not refer to shirts, merchandise, products, purchases or QR codes in the story.

The visitor should feel as though they discovered a forgotten interactive cartridge.

## Creative Direction

Create an original visual and audio experience influenced by:

* Retro game cartridges
* Late 1980s and 1990s skate and surf game energy
* Coastal arcade culture
* Demoscene graphics
* PS1, N64 and late NES aesthetics
* Low-poly environments
* Pixel art, dithering and analog distortion
* Electronic, breakbeat, surf and ambient sound
* Santa Cruz boardwalk and coastal atmosphere

Capture the playful energy of classic skate and surf games without copying existing characters, names, logos, music, levels or artwork.

This is primarily a visual, audio and interactive experience rather than a conventional game. Each chapter should take approximately two to five minutes to experience.

## Chapter System

The visitor progresses through an ordered series of chapters.

Only one uncompleted chapter can be active at a time.

When the active chapter is completed, the next chapter must follow one of two policies:

1. `immediate`: The next chapter becomes available immediately.
2. `countdown`: The next chapter becomes available after a configurable delay of no more than 24 hours.

When a delayed chapter is locked, display an atmospheric countdown:

```text
NEXT SIGNAL IN
17:42:08
```

The countdown must:

* Use a server-generated unlock timestamp
* Continue correctly after refreshing or closing the browser
* Not depend exclusively on the phone’s clock
* Refetch chapter state when it reaches zero
* Unlock without requiring a new deployment
* Work without a scheduled cron job

A completed chapter cannot be completed twice. Completion requests must be idempotent.

## Seed and Time

Every permanent token has a deterministic numeric seed.

Use the seed to produce repeatable variations in:

* Colors
* Geometry
* Particle formations
* Environmental details
* Symbols
* Audio parameters
* Camera paths
* Chapter transitions

The same token must always produce the same underlying world.

Time is important to progression, but the story should be driven by completed chapters rather than passive calendar dates.

The database should record:

* First visit
* Chapter start
* Chapter completion
* Next chapter unlock time
* Last visit

## Visitor Progress

Separate the world’s token from the visitor’s identity.

The token determines the world and procedural seed. An anonymous signed visitor cookie determines progress within that world.

Create progress records using:

```text
experienceTokenId + visitorId
```

This allows another visitor to scan the same code without consuming the original visitor’s progress.

Do not require registration for the initial version. Design the data layer so optional account claiming and cross-device synchronization can be added later.

## Recommended Architecture

Use one Next.js application deployed on Vercel.

Do not generate, commit or deploy a separate HTML file for each token.

Use:

* Next.js App Router
* Nova64 for chapter execution
* Default Node.js runtime
* Neon Postgres through the Vercel Marketplace
* Drizzle ORM
* Vercel Blob for large public audio and visual assets
* GitHub as the source of truth for chapter code
* Vercel automatic deployments from GitHub

Use a shared route:

```text
app/x/[token]/page.tsx
```

The page should:

1. Validate the token on the server.
2. Resolve or create the anonymous visitor.
3. Load the visitor’s current progress.
4. Return the initial chapter state to the client.
5. Start Nova64 only after deliberate touch interaction.
6. Load the appropriate chapter cartridge.
7. Report completion to the server.
8. Display either the next chapter or its countdown.

## API

Implement these Route Handlers:

```text
GET  /api/experience/[token]
POST /api/experience/[token]/start
POST /api/experience/[token]/complete
```

### GET state response

```json
{
  "serverTime": "2026-08-25T04:00:00.000Z",
  "experience": {
    "seed": 481516,
    "storyId": "coastal-signal"
  },
  "chapter": {
    "id": "chapter-02",
    "title": "Low Tide",
    "status": "available",
    "cartUrl": "/carts/coastal-signal/chapter-02.js"
  },
  "progress": {
    "completedChapterIds": ["chapter-01"],
    "nextUnlockAt": null
  }
}
```

For a locked chapter, do not return an executable `cartUrl`.

### Complete chapter request

```json
{
  "chapterId": "chapter-02",
  "completionId": "client-generated-uuid"
}
```

The server must validate that:

* The token exists and is active
* The visitor is valid
* The chapter is currently available
* The chapter is the expected current chapter
* It has not already been completed
* The completion ID has not already been processed

Complete the chapter and calculate `nextUnlockAt` in one database transaction.

## Suggested Database Tables

Create tables resembling:

```text
experiences
  id
  public_token
  seed
  story_id
  status
  created_at

visitors
  id
  signed_identifier
  created_at
  last_seen_at

progress
  id
  experience_id
  visitor_id
  current_chapter_id
  next_unlock_at
  first_started_at
  updated_at

chapter_completions
  id
  progress_id
  chapter_id
  completion_id
  started_at
  completed_at
```

Add appropriate unique constraints and indexes.

## Chapter Registry

Store chapter source code and manifests in GitHub:

```text
stories/
  coastal-signal/
    manifest.ts
    chapters/
      01-arrival/
        cart.ts
        assets.ts
      02-low-tide/
        cart.ts
        assets.ts
      03-transmission/
        cart.ts
        assets.ts
```

The manifest should declare:

```ts
{
  id: "chapter-02",
  order: 2,
  title: "Low Tide",
  unlockPolicy: "countdown",
  unlockDelaySeconds: 86400,
  cartModule: "chapter-02"
}
```

Support shorter delays in development and automated tests.

Adding a new chapter should require:

1. Adding its Nova64 cartridge and assets.
2. Registering it in the story manifest.
3. Committing it to GitHub.
4. Allowing Vercel to deploy the change.

It must not require modifying existing QR codes or generating new pages.

## Nova64 Chapter Contract

Define a standard cartridge lifecycle:

```ts
interface ChapterContext {
  tokenSeed: number;
  chapterSeed: number;
  previousChoices: Record<string, unknown>;
  complete: (result?: ChapterResult) => Promise<void>;
}

interface ChapterResult {
  choices?: Record<string, unknown>;
  score?: number;
  discovered?: string[];
}
```

Inspect the existing Nova64 repository and runtime before implementing this interface. Adapt it to existing Nova64 cartridge conventions rather than inventing duplicate rendering, input or audio systems.

A chapter may call `complete()` only after its intended visual interaction has finished.

## Mobile Experience

The initial screen must be visually interesting but silent because mobile browsers restrict automatic audio.

Display an interaction such as:

```text
TOUCH TO RECEIVE SIGNAL
```

After the touch:

* Initialize Nova64
* Resume the Web Audio context
* Enter fullscreen when supported
* Begin the chapter’s animation and soundtrack
* Enable touch and device-orientation interaction when permitted

Include graceful fallbacks for devices that reject orientation or fullscreen permission.

## Provisioning QR Experiences

Create an administrative CLI script:

```text
pnpm experience:create --story coastal-signal --count 25
```

For every experience, it should:

1. Generate a cryptographically random public token.
2. Generate a deterministic seed.
3. Insert the experience record into Postgres.
4. Create a permanent URL.
5. Generate SVG and high-resolution PNG QR images.
6. Produce a CSV containing serial, token, URL, seed and QR filename.

Never place database IDs, email addresses or API credentials in QR URLs.

The script should be safe to rerun and must never overwrite an existing experience.

## Reliability

Implement:

* Idempotent completion
* Database transactions
* Input validation
* Rate limiting on mutations
* Structured server logging
* Disabled-token handling
* Missing-chapter fallback
* Database migration scripts
* Seeded test data
* Loading and error states
* Mobile performance budgeting
* Cache headers for immutable cartridge assets
* No caching for visitor-specific progress responses

## Required Tests

Test that:

1. A valid token opens Chapter One.
2. An invalid or disabled token produces an intentional error scene.
3. Completing an immediate chapter unlocks the next chapter.
4. Completing a delayed chapter creates the correct unlock timestamp.
5. Refreshing preserves the countdown.
6. Changing the device clock does not unlock a chapter early.
7. Repeated completion requests do not duplicate progress.
8. A visitor cannot skip directly to a later chapter.
9. Two anonymous visitors can have separate progress for the same token.
10. The same token always produces the same procedural seed.
11. The experience works on current iOS Safari and Android Chrome.
12. Audio begins only after an accepted user gesture.

## Deliverables

Provide:

* Architecture summary
* Database schema and migrations
* Next.js routes and API handlers
* Nova64 chapter loader
* Anonymous visitor system
* Countdown interface
* One immediate-unlock example
* One 24-hour-unlock example
* Provisioning and QR-generation script
* Automated tests
* Environment variable documentation
* Local development instructions
* Vercel deployment instructions

Build the smallest reliable end-to-end version first:

```text
QR token
→ Chapter One
→ completion
→ persisted 24-hour countdown
→ Chapter Two unlock
```

Verify that complete flow before expanding the visual content or adding additional chapters.
