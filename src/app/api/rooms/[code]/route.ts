import { NextResponse } from "next/server";
import { getRoom, newSecret, setRoom } from "@/lib/realtime/store";
import { createLudo, ludoMove, ludoRoll, movableTokens, type LudoState } from "@/lib/realtime/ludo";
import { createRace, raceFill, raceView, type RaceState } from "@/lib/realtime/sudoku-race";
import type { Difficulty } from "@/lib/games/sudoku";

export const runtime = "nodejs";

const MAX_PLAYERS = 4;

function clientView(roomState: unknown, game: string, playerId: string) {
  if (!roomState) return null;
  if (game === "sudoku-race") return raceView(roomState as RaceState, playerId);
  if (game === "ludo") {
    const s = roomState as LudoState;
    return {
      ...s,
      movable:
        s.dice !== null ? movableTokens(s, s.turn, s.dice) : [],
    };
  }
  return roomState;
}

/** GET /api/rooms/CODE?playerId=&v= — poll state. */
export async function GET(request: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  const { code } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId") ?? "";
  const since = Number(searchParams.get("v") ?? -1);

  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found or expired." }, { status: 404 });
  if (room.version === since) return NextResponse.json({ unchanged: true, version: room.version });

  return NextResponse.json({
    version: room.version,
    code: room.code,
    game: room.game,
    hostId: room.hostId,
    status: room.status,
    players: room.players,
    state: room.status === "lobby" ? null : clientView(room.state, room.game, playerId),
  });
}

/** POST /api/rooms/CODE — actions: join, start, roll, move, fill. */
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  const { code } = await ctx.params;
  const body = (await request.json()) as {
    action?: string;
    name?: string;
    playerId?: string;
    token?: string;
    tokenIdx?: number;
    difficulty?: string;
    r?: number;
    c?: number;
    v?: number;
  };

  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found or expired." }, { status: 404 });

  // Join is the only unauthenticated action.
  if (body.action === "join") {
    const name = String(body.name ?? "").trim().slice(0, 20);
    if (!name) return NextResponse.json({ error: "Pick a display name." }, { status: 400 });
    if (room.status !== "lobby")
      return NextResponse.json({ error: "Game already started." }, { status: 409 });
    if (room.players.length >= MAX_PLAYERS)
      return NextResponse.json({ error: "Room is full (4 players)." }, { status: 409 });

    const playerId = crypto.randomUUID();
    const token = newSecret();
    const usedColors = new Set(room.players.map((p) => p.color));
    const color = [0, 1, 2, 3].find((c) => !usedColors.has(c)) ?? 0;
    room.players.push({ id: playerId, name, color });
    room.secrets[playerId] = token;
    await setRoom(room);
    return NextResponse.json({ playerId, token, version: room.version });
  }

  // Everything else needs a valid player token.
  const { playerId = "", token = "" } = body;
  if (!playerId || room.secrets[playerId] !== token) {
    return NextResponse.json({ error: "Not authorized for this room." }, { status: 401 });
  }

  let error: string | null = null;

  switch (body.action) {
    case "start": {
      if (playerId !== room.hostId) error = "Only the host can start.";
      else if (room.status !== "lobby") error = "Already started.";
      else if (room.game === "ludo" && room.players.length < 2)
        error = "Ludo needs at least 2 players.";
      else {
        room.status = "playing";
        if (room.game === "ludo") {
          room.state = createLudo(room.players);
        } else {
          const diff = (["easy", "medium", "hard"].includes(body.difficulty ?? "")
            ? body.difficulty
            : "easy") as Difficulty;
          room.state = createRace(room.players.map((p) => p.id), diff);
        }
      }
      break;
    }
    case "roll": {
      if (room.status !== "playing" || room.game !== "ludo") error = "Not a running Ludo game.";
      else {
        error = ludoRoll(room.state as LudoState, playerId);
        if ((room.state as LudoState).winner) room.status = "finished";
      }
      break;
    }
    case "move": {
      if (room.status !== "playing" || room.game !== "ludo") error = "Not a running Ludo game.";
      else {
        error = ludoMove(room.state as LudoState, playerId, Number(body.tokenIdx ?? -1));
        if ((room.state as LudoState).winner) room.status = "finished";
      }
      break;
    }
    case "fill": {
      if (room.status !== "playing" || room.game !== "sudoku-race")
        error = "Not a running race.";
      else {
        error = raceFill(
          room.state as RaceState,
          playerId,
          Number(body.r),
          Number(body.c),
          Number(body.v)
        );
        if ((room.state as RaceState).winner) room.status = "finished";
        if (error === "wrong") {
          // Not a protocol error; bump version so the miss count syncs.
          await setRoom(room);
          return NextResponse.json({ wrong: true, version: room.version });
        }
      }
      break;
    }
    default:
      error = "Unknown action.";
  }

  if (error) return NextResponse.json({ error }, { status: 400 });
  await setRoom(room);
  return NextResponse.json({ ok: true, version: room.version });
}
