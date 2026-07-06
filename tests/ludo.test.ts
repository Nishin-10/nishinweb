import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createLudo,
  ludoMove,
  ludoRoll,
  movableTokens,
  trackIndex,
  type LudoState,
} from "../src/lib/realtime/ludo.ts";

function freshGame(): LudoState {
  return createLudo([
    { id: "a", name: "A", color: 0 },
    { id: "b", name: "B", color: 1 },
  ]);
}

test("turn order and roll validation", () => {
  const s = freshGame();
  assert.equal(ludoRoll(s, "b"), "Not your turn.");
  assert.equal(ludoMove(s, "a", 0), "Roll first.");
});

test("needs a six to leave base", () => {
  const s = freshGame();
  assert.deepEqual(movableTokens(s, 0, 3), []);
  assert.deepEqual(movableTokens(s, 0, 6), [0, 1, 2, 3]);
});

test("capture sends opponent home and grants extra turn", () => {
  const s = freshGame();
  // Hand-place: A's token at progress 10, B's token on the same absolute cell.
  s.players[0].tokens[0] = 10;
  const cell = trackIndex(0, 10);
  // B's progress p such that trackIndex(1, p) === cell:
  const p = (cell - 13 + 52) % 52;
  s.players[1].tokens[0] = p;
  s.turn = 0;
  s.dice = 4;
  s.players[0].tokens[0] = 6; // 6 + 4 = 10 lands on B
  const err = ludoMove(s, "a", 0);
  assert.equal(err, null);
  assert.equal(s.players[1].tokens[0], -1, "B captured back to base");
  assert.equal(s.turn, 0, "capture grants extra turn");
});

test("exact finish and winner detection", () => {
  const s = freshGame();
  s.players[0].tokens = [56, 56, 56, 54];
  s.turn = 0;
  s.dice = 2;
  assert.equal(ludoMove(s, "a", 3), null);
  assert.equal(s.winner, "a");
  // Overshoot is not a legal move
  const s2 = freshGame();
  s2.players[0].tokens = [55, -1, -1, -1];
  assert.deepEqual(movableTokens(s2, 0, 3), [], "cannot overshoot home");
});
