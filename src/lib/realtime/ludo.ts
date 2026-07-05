/**
 * Server-authoritative Ludo engine.
 *
 * Token progress `p`: -1 in base; 0..50 on the shared 52-cell track measured
 * from the player's own start; 51..55 in the home column; 56 done.
 * Dice rolls happen server-side. Extra turn on a six, a capture, or bringing
 * a token home. Three sixes in a row forfeits the turn.
 */

export interface LudoPlayer {
  id: string;
  name: string;
  color: number; // 0 red, 1 green, 2 yellow, 3 blue
  tokens: number[]; // four progress values
}

export interface LudoState {
  players: LudoPlayer[];
  turn: number; // index into players
  dice: number | null; // pending roll awaiting a move
  lastRoll: number | null;
  sixes: number;
  winner: string | null; // player id
  note: string; // one-line event feed for the UI
}

export const START_INDEX = [0, 13, 26, 39];
export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/** The 52 track cells as [col,row] on a 15x15 grid, clockwise. */
export const TRACK: [number, number][] = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], [8, 0],
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], [6, 14],
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6],
];

/** Home column cells per color, base-to-center order. */
export const HOME_COLUMNS: [number, number][][] = [
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
];

export function trackIndex(color: number, p: number): number {
  return (START_INDEX[color] + p) % 52;
}

export function createLudo(players: { id: string; name: string; color: number }[]): LudoState {
  return {
    players: players.map((pl) => ({ ...pl, tokens: [-1, -1, -1, -1] })),
    turn: 0,
    dice: null,
    lastRoll: null,
    sixes: 0,
    winner: null,
    note: `${players[0].name} rolls first.`,
  };
}

export function movableTokens(state: LudoState, playerIdx: number, dice: number): number[] {
  const tokens = state.players[playerIdx].tokens;
  return tokens
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => (p === -1 ? dice === 6 : p >= 0 && p < 56 && p + dice <= 56))
    .map(({ i }) => i);
}

function nextTurn(state: LudoState) {
  state.turn = (state.turn + 1) % state.players.length;
  state.dice = null;
  state.sixes = 0;
}

export function ludoRoll(state: LudoState, playerId: string): string | null {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx !== state.turn) return "Not your turn.";
  if (state.dice !== null) return "You already rolled. Move a token.";
  if (state.winner) return "Game is over.";

  const dice = 1 + Math.floor(Math.random() * 6);
  state.lastRoll = dice;
  const player = state.players[idx];

  if (dice === 6) {
    state.sixes += 1;
    if (state.sixes >= 3) {
      state.note = `${player.name} rolled three sixes. Turn forfeited.`;
      nextTurn(state);
      return null;
    }
  }

  if (movableTokens(state, idx, dice).length === 0) {
    state.note = `${player.name} rolled ${dice}. No moves.`;
    if (dice !== 6) nextTurn(state);
    // On a six with nothing movable (rare: all done/blocked), still pass.
    else nextTurn(state);
    return null;
  }

  state.dice = dice;
  state.note = `${player.name} rolled ${dice}.`;
  return null;
}

export function ludoMove(state: LudoState, playerId: string, tokenIdx: number): string | null {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx !== state.turn) return "Not your turn.";
  if (state.dice === null) return "Roll first.";
  if (state.winner) return "Game is over.";
  if (tokenIdx < 0 || tokenIdx > 3) return "Bad token.";
  if (!movableTokens(state, idx, state.dice).includes(tokenIdx)) {
    return "That token can't move with this roll.";
  }

  const player = state.players[idx];
  const dice = state.dice;
  const from = player.tokens[tokenIdx];
  const to = from === -1 ? 0 : from + dice;
  player.tokens[tokenIdx] = to;

  let captured = false;
  if (to <= 50) {
    const cell = trackIndex(player.color, to);
    if (!SAFE_CELLS.has(cell)) {
      for (const other of state.players) {
        if (other.id === player.id) continue;
        other.tokens = other.tokens.map((p) => {
          if (p >= 0 && p <= 50 && trackIndex(other.color, p) === cell) {
            captured = true;
            return -1;
          }
          return p;
        });
      }
    }
  }

  const finished = to === 56;
  if (player.tokens.every((p) => p === 56)) {
    state.winner = player.id;
    state.note = `${player.name} wins!`;
    state.dice = null;
    return null;
  }

  const extra = dice === 6 || captured || finished;
  state.note = captured
    ? `${player.name} captured a token!`
    : finished
      ? `${player.name} brought a token home.`
      : `${player.name} moved.`;
  state.dice = null;
  if (!extra) nextTurn(state);
  return null;
}
