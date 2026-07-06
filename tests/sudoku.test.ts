import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, isValid, isComplete } from "../src/lib/games/sudoku.ts";

test("generated puzzles are valid and match their solution", () => {
  const { puzzle, solution } = generate("easy");

  // Solution is a complete, rule-respecting grid
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = solution[r][c];
      assert.ok(v >= 1 && v <= 9, "solution cell in range");
      solution[r][c] = 0;
      assert.ok(isValid(solution, r, c, v), `solution respects rules at ${r},${c}`);
      solution[r][c] = v;
    }
  }

  // Puzzle is a subset of the solution
  let givens = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] !== 0) {
        givens++;
        assert.equal(puzzle[r][c], solution[r][c], "given matches solution");
      }
    }
  }
  assert.ok(givens >= 17, "enough givens to be solvable");
  assert.equal(isComplete(solution, solution), true);
  assert.equal(isComplete(puzzle, solution), false);
});

test("difficulty removes more cells", () => {
  const count = (g: number[][]) => g.flat().filter((v) => v !== 0).length;
  const easy = count(generate("easy").puzzle);
  const hard = count(generate("hard").puzzle);
  assert.ok(easy > hard, `easy (${easy} givens) should exceed hard (${hard})`);
});
