import ironFjordExtended from '../assets/music/Iron Fjord (Extended with Nordic Chants).mp3';
import ironFjordWarlike from '../assets/music/Iron Fjord (Warlike Version).mp3';
import shieldWall1 from '../assets/music/Shield Wall (1).mp3';
import shieldWall2 from '../assets/music/Shield Wall (2).mp3';
import shieldWall from '../assets/music/Shield Wall.mp3';
import shieldwall from '../assets/music/Shieldwall.mp3';

export interface Track {
  key: string;
  title: string;
  url: string;
}

/** Title theme. Loops on the menu once a tap or key has unlocked audio. */
export const MENU_TRACK: Track = {
  key: 'music-iron-fjord-extended',
  title: 'Iron Fjord (Extended with Nordic Chants)',
  url: ironFjordExtended,
};

/**
 * Run playlist, in rotation order. The warlike Iron Fjord starts each visit
 * from the menu; the four Shield Wall tracks follow, then the list loops.
 */
export const RUN_TRACKS: Track[] = [
  { key: 'music-iron-fjord-warlike', title: 'Iron Fjord (Warlike Version)', url: ironFjordWarlike },
  { key: 'music-shield-wall-1', title: 'Shield Wall (1)', url: shieldWall1 },
  { key: 'music-shield-wall-2', title: 'Shield Wall (2)', url: shieldWall2 },
  { key: 'music-shield-wall', title: 'Shield Wall', url: shieldWall },
  { key: 'music-shieldwall', title: 'Shieldwall', url: shieldwall },
];

export const ALL_TRACKS: Track[] = [MENU_TRACK, ...RUN_TRACKS];
