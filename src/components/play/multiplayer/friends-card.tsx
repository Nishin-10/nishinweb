"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dices, Grid3X3, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveIdentity } from "@/lib/realtime/use-room";

export function FriendsCard() {
  const router = useRouter();
  const [game, setGame] = useState<"ludo" | "sudoku-race">("ludo");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create room.");
      saveIdentity(data.code, { playerId: data.playerId, token: data.token });
      router.push(`/play/room/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create room.");
      setCreating(false);
    }
  };

  return (
    <Card className="border-accent/40 bg-[linear-gradient(135deg,var(--accent-soft),transparent_60%)]">
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-white">
            <Users className="h-5.5 w-5.5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display font-semibold">Play with friends</h2>
            <p className="text-sm text-fg-muted">
              Live rooms, up to 4 players. Create one, send the link, play.
            </p>
          </div>
          <Badge tone="accent" className="ml-auto hidden sm:inline-flex">New</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={game === "ludo" ? "primary" : "outline"}
            onClick={() => setGame("ludo")}
          >
            <Dices className="h-4 w-4" /> Ludo
          </Button>
          <Button
            size="sm"
            variant={game === "sudoku-race" ? "primary" : "outline"}
            onClick={() => setGame("sudoku-race")}
          >
            <Grid3X3 className="h-4 w-4" /> Sudoku Race
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Your display name"
            className="sm:max-w-44"
          />
          <Button onClick={create} disabled={creating || !name.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create room
          </Button>
          <div className="flex gap-2 sm:ml-auto">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              aria-label="Room code to join"
              className="w-32 font-mono uppercase tracking-widest"
              maxLength={6}
            />
            <Button
              variant="outline"
              disabled={joinCode.length !== 6}
              onClick={() => router.push(`/play/room/${joinCode}`)}
            >
              Join
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
