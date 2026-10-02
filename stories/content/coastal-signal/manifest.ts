import type { StoryManifest } from '../types';

const manifest: StoryManifest = {
  storyId: 'coastal-signal',
  title: 'Coastal Signal',
  chapters: [
    {
      id: 'chapter-01',
      order: 1,
      title: 'Arrival',
      unlockPolicy: 'immediate',
      cartModule: '01-arrival',
    },
    {
      id: 'chapter-02',
      order: 2,
      title: 'Low Tide',
      unlockPolicy: 'countdown',
      unlockDelaySeconds: 86400,
      cartModule: '02-low-tide',
    },
  ],
};

export default manifest;
