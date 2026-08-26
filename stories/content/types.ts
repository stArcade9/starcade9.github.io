export type UnlockPolicy = 'immediate' | 'countdown';

export interface ChapterManifestEntry {
  /** Stable chapter id, also used as the built cart's output filename (`<id>.js`). */
  id: string;
  order: number;
  title: string;
  unlockPolicy: UnlockPolicy;
  /** Required when unlockPolicy is "countdown". Max 86400 (24h) per stories.md. */
  unlockDelaySeconds?: number;
  /** Folder name under chapters/ containing this chapter's cart.ts entry point. */
  cartModule: string;
}

export interface StoryManifest {
  storyId: string;
  title: string;
  chapters: ChapterManifestEntry[];
}
