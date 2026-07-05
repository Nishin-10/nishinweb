import { NextResponse } from "next/server";
import { getRoom, newRoomCode, newSecret, setRoom, usingRedis, type RoomRecord } from "@/lib/realtime/store";

export const runtime = "nodejs";

/** Create a room. Body: { game, name } → { code, playerId, token } */
export async function POST(request: Request) {
  const { game, name } = (await request.json()) as { game?: string; name?: string };
  if (game !== "ludo" && game !== "sudoku-race") {
    return NextResponse.json({ error: "Unknown game." }, { status: 400 });
  }
  const cleanName = String(name ?? "").trim().slice(0, 20);
  if (!cleanName) {
    return NextResponse.json({ error: "Pick a display name." }, { status: 400 });
  }

  if (process.env.VERCEL && !usingRedis()) {
    return NextResponse.json(
      {
        error:
          "Multiplayer needs a Redis store on serverless hosting. In Vercel: Storage tab -> Create Upstash Redis (free) -> connect to this project -> redeploy.",
      },
      { status: 503 }
    );
  }

  // Collision-checked short code
  let code = newRoomCode();
  for (let i = 0; i < 3 && (await getRoom(code)); i++) code = newRoomCode();

  const playerId = crypto.randomUUID();
  const token = newSecret();
  const room: RoomRecord = {
    code,
    game,
    hostId: playerId,
    status: "lobby",
    players: [{ id: playerId, name: cleanName, color: 0 }],
    secrets: { [playerId]: token },
    state: null,
    version: 0,
    createdAt: Date.now(),
  };
  await setRoom(room);
  return NextResponse.json({ code, playerId, token });
}
