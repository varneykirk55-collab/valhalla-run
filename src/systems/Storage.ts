import { BEST_KEY } from '../config';

/** localStorage can throw (private mode, embedded frames) — never let that break the game. */
export function loadBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number): void {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // ignore
  }
}
