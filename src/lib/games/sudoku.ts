/** Sudoku generation and checking. Classic backtracking, seeded per call. */

export type Grid = number[][]; // 0 = empty

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isValid(grid: Grid, row: number, col: number, value: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === value || grid[i][col] === value) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (grid[r][c] === value) return false;
    }
  }
  return true;
}

function fill(grid: Grid, cell = 0): boolean {
  if (cell === 81) return true;
  const row = Math.floor(cell / 9);
  const col = cell % 9;
  if (grid[row][col] !== 0) return fill(grid, cell + 1);
  for (const v of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (isValid(grid, row, col, v)) {
      grid[row][col] = v;
      if (fill(grid, cell + 1)) return true;
      grid[row][col] = 0;
    }
  }
  return false;
}

function countSolutions(grid: Grid, limit = 2): number {
  let count = 0;
  const solve = (cell: number): boolean => {
    if (count >= limit) return true;
    if (cell === 81) {
      count++;
      return count >= limit;
    }
    const row = Math.floor(cell / 9);
    const col = cell % 9;
    if (grid[row][col] !== 0) return solve(cell + 1);
    for (let v = 1; v <= 9; v++) {
      if (isValid(grid, row, col, v)) {
        grid[row][col] = v;
        if (solve(cell + 1)) {
          grid[row][col] = 0;
          return true;
        }
        grid[row][col] = 0;
      }
    }
    return false;
  };
  solve(0);
  return count;
}

export type Difficulty = "easy" | "medium" | "hard";

const HOLES: Record<Difficulty, number> = { easy: 38, medium: 48, hard: 54 };

export function generate(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  const solution: Grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  fill(solution);

  const puzzle = solution.map((r) => [...r]);
  const cells = shuffled(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;

  for (const cell of cells) {
    if (removed >= HOLES[difficulty]) break;
    const row = Math.floor(cell / 9);
    const col = cell % 9;
    const backup = puzzle[row][col];
    if (backup === 0) continue;
    puzzle[row][col] = 0;
    // Keep puzzles honest: exactly one solution.
    if (countSolutions(puzzle.map((r) => [...r])) !== 1) {
      puzzle[row][col] = backup;
    } else {
      removed++;
    }
  }

  return { puzzle, solution };
}

export function isComplete(grid: Grid, solution: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}
