/** Per-game score history, kept in localStorage. */

export interface GameRecord {
  score: number;
  label: string; // human-readable, e.g. "Hard · 4:32" or "won vs level 2"
  at: string;
}

export interface GameStats {
  plays: number;
  best: number | null;
  bestIsLowest?: boolean;
  history: GameRecord[];
}

const KEY = "companion:game-stats";

type AllStats = Record<string, GameStats>;

function readAll(): AllStats {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as AllStats;
  } catch {
    return {};
  }
}

export const gameStats = {
  all: readAll,
  get(game: string): GameStats {
    return readAll()[game] ?? { plays: 0, best: null, history: [] };
  },
  record(game: string, score: number, label: string, bestIsLowest = false) {
    const all = readAll();
    const s = all[game] ?? { plays: 0, best: null, bestIsLowest, history: [] };
    s.plays += 1;
    s.bestIsLowest = bestIsLowest;
    s.best =
      s.best === null ? score : bestIsLowest ? Math.min(s.best, score) : Math.max(s.best, score);
    s.history = [{ score, label, at: new Date().toISOString() }, ...s.history].slice(0, 20);
    all[game] = s;
    window.localStorage.setItem(KEY, JSON.stringify(all));
  },
};
