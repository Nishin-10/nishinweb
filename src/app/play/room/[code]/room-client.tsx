"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Loader2, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  loadIdentity,
  saveIdentity,
  useRoom,
  type Identity,
} from "@/lib/realtime/use-room";
import { LudoBoard } from "@/components/play/multiplayer/ludo-board";
import { RaceBoard } from "@/components/play/multiplayer/race-board";

const GAME_NAMES = { ludo: "Ludo", "sudoku-race": "Sudoku Race" } as const;
const PLAYER_COLORS = ["bg-[#e5484d]", "bg-[#30a46c]", "bg-[#f5a623]", "bg-[#4f7df0]"];

export function RoomClient({ code }: { code: string }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [difficulty, setDifficulty] = useState("easy");

  const { room, error, send, wrongFlash } = useRoom(code, identity);

  useEffect(() => {
    setIdentity(loadIdentity(code));
    setHydrated(true);
  }, [code]);

  const join = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not join.");
      const id = { playerId: data.playerId, token: data.token };
      saveIdentity(code, id);
      setIdentity(id);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Could not join.");
    } finally {
      setJoining(false);
    }
  };

  const act = async (action: Record<string, unknown>) => {
    setBusy(true);
    const err = await send(action);
    setActionError(err);
    setBusy(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!hydrated || (!room && !error)) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-fg-muted">{error}</CardContent>
      </Card>
    );
  }
  if (!room) return null;

  const isHost = identity?.playerId === room.hostId;
  const inRoom = Boolean(identity && room.players.some((p) => p.id === identity.playerId));

  // Join screen for newcomers
  if (!inRoom) {
    if (room.status !== "lobby") {
      return (
        <Card>
          <CardContent className="py-12 text-center text-sm text-fg-muted">
            This {GAME_NAMES[room.game]} game already started without you. Ask for a new room link.
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="mx-auto max-w-sm">
        <CardContent className="space-y-4 py-8 text-center">
          <Users className="mx-auto h-8 w-8 text-accent" />
          <div>
            <h2 className="font-display text-lg font-bold">Join {GAME_NAMES[room.game]}</h2>
            <p className="text-sm text-fg-muted">
              {room.players[0]?.name} invited you. {room.players.length}/4 in the room.
            </p>
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && join()}
            placeholder="Your name"
            aria-label="Your display name"
            autoFocus
          />
          <Button className="w-full" onClick={join} disabled={joining || !name.trim()}>
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Join game
          </Button>
          {joinError && <p className="text-sm text-danger">{joinError}</p>}
        </CardContent>
      </Card>
    );
  }

  // Lobby
  if (room.status === "lobby") {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="space-y-5 py-8">
          <div className="text-center">
            <Badge tone="accent" className="mb-2">{GAME_NAMES[room.game]}</Badge>
            <h2 className="font-display text-2xl font-bold tracking-widest">{room.code}</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Share this page&apos;s link. Friends open it, type a name, and they&apos;re in.
            </p>
          </div>

          <Button variant="outline" className="w-full" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy invite link"}
          </Button>

          <ul className="space-y-1.5" aria-label="Players in room">
            {room.players.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm"
              >
                <span className={`h-3 w-3 rounded-full ${PLAYER_COLORS[p.color]}`} aria-hidden />
                <span className="font-medium">{p.name}</span>
                {p.id === room.hostId && <Badge>host</Badge>}
                {p.id === identity?.playerId && <Badge tone="accent">you</Badge>}
                {i === 0 && room.players.length === 1 && (
                  <span className="ml-auto text-xs text-fg-subtle">waiting for friends…</span>
                )}
              </motion.li>
            ))}
          </ul>

          {isHost ? (
            <div className="space-y-3">
              {room.game === "sudoku-race" && (
                <div className="flex justify-center gap-2">
                  {["easy", "medium", "hard"].map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant={difficulty === d ? "primary" : "outline"}
                      onClick={() => setDifficulty(d)}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => act({ action: "start", difficulty })}
                disabled={busy || (room.game === "ludo" && room.players.length < 2)}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start {room.game === "ludo" && room.players.length < 2 ? "(need 2+ players)" : ""}
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-fg-muted" aria-live="polite">
              Waiting for {room.players.find((p) => p.id === room.hostId)?.name} to start…
            </p>
          )}
          {actionError && <p className="text-center text-sm text-danger">{actionError}</p>}
        </CardContent>
      </Card>
    );
  }

  // Playing / finished
  return (
    <div className="space-y-4">
      {actionError && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" aria-live="assertive">
          {actionError}
        </p>
      )}
      {room.game === "ludo" ? (
        <LudoBoard
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          state={room.state as any}
          myId={identity!.playerId}
          busy={busy}
          onRoll={() => act({ action: "roll" })}
          onMove={(tokenIdx) => act({ action: "move", tokenIdx })}
        />
      ) : (
        <RaceBoard
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          state={room.state as any}
          players={room.players}
          myId={identity!.playerId}
          wrongFlash={wrongFlash}
          onFill={(r, c, v) => act({ action: "fill", r, c, v })}
        />
      )}
    </div>
  );
}
