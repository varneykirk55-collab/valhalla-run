export interface Track {
  key: string;
  title: string;
  url: string;
}

/**
 * The MP3s live in this repo at src/assets/music. Playback uses GitHub's
 * raw file host for that commit so a small static shell can stream them
 * without packing 20 MB of audio into the page bundle.
 */
const RAW =
  'https://raw.githubusercontent.com/varneykirk55-collab/valhalla-run/27337386328f60ac4cc7786c06c67be55782d89b/src/assets/music/';

function trackUrl(filename: string): string {
  return RAW + encodeURIComponent(filename);
}

/** Title theme. Loops on the menu once a tap or key has unlocked audio. */
export const MENU_TRACK: Track = {
  key: 'music-iron-fjord-extended',
  title: 'Iron Fjord (Extended with Nordic Chants)',
  url: trackUrl('Iron Fjord (Extended with Nordic Chants).mp3'),
};

/**
 * Run playlist, in rotation order. The warlike Iron Fjord starts each visit
 * from the menu; the four Shield Wall tracks follow, then the list loops.
 */
export const RUN_TRACKS: Track[] = [
  {
    key: 'music-iron-fjord-warlike',
    title: 'Iron Fjord (Warlike Version)',
    url: trackUrl('Iron Fjord (Warlike Version).mp3'),
  },
  { key: 'music-shield-wall-1', title: 'Shield Wall (1)', url: trackUrl('Shield Wall (1).mp3') },
  { key: 'music-shield-wall-2', title: 'Shield Wall (2)', url: trackUrl('Shield Wall (2).mp3') },
  { key: 'music-shield-wall', title: 'Shield Wall', url: trackUrl('Shield Wall.mp3') },
  { key: 'music-shieldwall', title: 'Shieldwall', url: trackUrl('Shieldwall.mp3') },
];

export const ALL_TRACKS: Track[] = [MENU_TRACK, ...RUN_TRACKS];
