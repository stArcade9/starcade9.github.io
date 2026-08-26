// Shared contract every chapter cart is loaded against (stories.md's
// "Nova64 Chapter Contract"). The experience shell sets `globalThis.__chapterContext`
// immediately before calling Nova64.loadCart(), following the same globalThis
// bridging pattern the runtime itself uses for the current cart path
// (see runtime/console.js -> globalThis.__NOVA64_CURRENT_CART_PATH).

export interface ChapterResult {
  choices?: Record<string, unknown>;
  score?: number;
  discovered?: string[];
}

export interface ChapterContext {
  tokenSeed: number;
  chapterSeed: number;
  previousChoices: Record<string, unknown>;
  complete: (result?: ChapterResult) => Promise<void>;
  /**
   * Sets (or clears, with null) the narrative HUD caption rendered as real
   * HTML/CSS over the canvas — Nova64's only in-engine text renderer is a
   * fixed 5x7 bitmap font, which can't give vector-quality typography, so
   * narrative captions live in the DOM instead. Call this on beat changes,
   * not every frame.
   */
  setCaption: (caption: string | null) => void;
}

declare global {
  // eslint-disable-next-line no-var
  var __chapterContext: ChapterContext | undefined;
}

export function getChapterContext(): ChapterContext {
  if (!globalThis.__chapterContext) {
    throw new Error(
      'Chapter cart loaded without a __chapterContext bridge — carts must be loaded through the experience shell, not directly.',
    );
  }
  return globalThis.__chapterContext;
}
