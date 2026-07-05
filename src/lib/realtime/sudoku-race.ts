/**
 * Server-authoritative Sudoku Race: everyone gets the same puzzle, first to
 * complete it wins. Wrong entries are rejected server-side and counted.
 */
import { generate, type Difficulty, type Grid } from "@/lib/games/sudoku";

export interface RaceState {
  difficulty: Difficulty;
  puzzle: Grid;
  /** Server-only; stripped before sending to clients. */
  solution: Grid;
  grids: Record<string, Grid>;
  errors: Record<string, number>;
  winner: string | null;
  startedAt: number;
  finishedAt: number | null;
}

export function createRace(playerIds: string[], difficulty: Difficulty): RaceState {
  const { puzzle, solution } = generate(difficulty);
  const grids: Record<string, Grid> = {};
  const errors: Record<string, number> = {};
  for (const id of playerIds) {
    grids[id] = puzzle.map((r) => [...r]);
    errors[id] = 0;
  }
  return {
    difficulty, puzzle, solution, grids, errors,
    winner: null, startedAt: Date.now(), finishedAt: null,
  };
}

export function raceFill(
  state: RaceState,
  playerId: string,
  r: number,
  c: number,
  v: number
): string | null {
  if (state.winner) return "Race is over.";
  const grid = state.grids[playerId];
  if (!grid) return "You're not in this race.";
  if (r < 0 || r > 8 || c < 0 || c > 8 || v < 0 || v > 9) return "Bad cell.";
  if (state.puzzle[r][c] !== 0) return "That cell is given.";

  if (v === 0) {
    grid[r][c] = 0;
    return null;
  }
  if (state.solution[r][c] !== v) {
    state.errors[playerId] += 1;
    return "wrong"; // handled gently client-side, not an error banner
  }
  grid[r][c] = v;

  const complete = grid.every((row, ri) => row.every((cell, ci) => cell === state.solution[ri][ci]));
  if (complete) {
    state.winner = playerId;
    state.finishedAt = Date.now();
  }
  return null;
}

export function raceProgress(state: RaceState, playerId: string): number {
  const grid = state.grids[playerId];
  if (!grid) return 0;
  let empties = 0;
  let filled = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.puzzle[r][c] === 0) {
        empties++;
        if (grid[r][c] !== 0) filled++;
      }
    }
  }
  return empties === 0 ? 1 : filled / empties;
}

/** Client-safe view: no solution, only the asking player's grid. */
export function raceView(state: RaceState, playerId: string) {
  return {
    difficulty: state.difficulty,
    puzzle: state.puzzle,
    grid: state.grids[playerId] ?? state.puzzle,
    myErrors: state.errors[playerId] ?? 0,
    winner: state.winner,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    progress: Object.fromEntries(
      Object.keys(state.grids).map((id) => [id, raceProgress(state, id)])
    ),
  };
}
