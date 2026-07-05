/**
 * Room persistence. Uses Upstash Redis (REST) when configured — required for
 * serverless hosting where instances share nothing — and falls back to an
 * in-process map for local dev / single-server deploys.
 */

export interface RoomRecord {
  code: string;
  game: "ludo" | "sudoku-race";
  hostId: string;
  status: "lobby" | "playing" | "finished";
  players: { id: string; name: string; color: number }[];
  /** playerId -> secret token; never sent to clients. */
  secrets: Record<string, string>;
  state: unknown;
  version: number;
  createdAt: number;
}

const TTL_SECONDS = 60 * 60 * 24; // rooms live one day

function redisCreds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function redisCommand<T>(command: (string | number)[]): Promise<T | null> {
  const creds = redisCreds();
  if (!creds) return null;
  const res = await fetch(creds.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}`);
  const json = (await res.json()) as { result: T };
  return json.result;
}

/* In-memory fallback (dev / single server). Survives across requests in one
   process only; on serverless each instance is isolated, hence Redis. */
const globalStore = globalThis as unknown as { __rooms?: Map<string, RoomRecord> };
const memory = (globalStore.__rooms ??= new Map<string, RoomRecord>());

export function usingRedis(): boolean {
  return redisCreds() !== null;
}

export async function getRoom(code: string): Promise<RoomRecord | null> {
  if (usingRedis()) {
    const raw = await redisCommand<string | null>(["GET", `room:${code}`]);
    return raw ? (JSON.parse(raw) as RoomRecord) : null;
  }
  const room = memory.get(code) ?? null;
  if (room && Date.now() - room.createdAt > TTL_SECONDS * 1000) {
    memory.delete(code);
    return null;
  }
  return room;
}

export async function setRoom(room: RoomRecord): Promise<void> {
  room.version += 1;
  if (usingRedis()) {
    await redisCommand(["SET", `room:${room.code}`, JSON.stringify(room), "EX", TTL_SECONDS]);
    return;
  }
  memory.set(room.code, room);
}

export function newRoomCode(): string {
  // Unambiguous alphabet (no 0/O, 1/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

export function newSecret(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
