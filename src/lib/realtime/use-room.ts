"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface RoomSnapshot {
  version: number;
  code: string;
  game: "ludo" | "sudoku-race";
  hostId: string;
  status: "lobby" | "playing" | "finished";
  players: { id: string; name: string; color: number }[];
  state: unknown;
}

export interface Identity {
  playerId: string;
  token: string;
}

const ID_KEY = (code: string) => `companion:room:${code}`;

export function loadIdentity(code: string): Identity | null {
  try {
    const raw = window.localStorage.getItem(ID_KEY(code));
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function saveIdentity(code: string, id: Identity) {
  window.localStorage.setItem(ID_KEY(code), JSON.stringify(id));
}

/** Polls room state (~1.2s) and exposes an action sender. */
export function useRoom(code: string, identity: Identity | null) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wrongFlash, setWrongFlash] = useState(0);
  const versionRef = useRef(-1);
  const identityRef = useRef(identity);
  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  const refresh = useCallback(async () => {
    try {
      const pid = identityRef.current?.playerId ?? "";
      const res = await fetch(
        `/api/rooms/${code}?playerId=${pid}&v=${versionRef.current}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Room unavailable.");
        return;
      }
      if (data.unchanged) return;
      versionRef.current = data.version;
      setRoom(data as RoomSnapshot);
      setError(null);
    } catch {
      /* transient network issue; next poll retries */
    }
  }, [code]);

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 1200);
    return () => clearInterval(t);
  }, [refresh]);

  const send = useCallback(
    async (action: Record<string, unknown>): Promise<string | null> => {
      try {
        const res = await fetch(`/api/rooms/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...action,
            playerId: identityRef.current?.playerId,
            token: identityRef.current?.token,
          }),
        });
        const data = await res.json();
        if (data.wrong) {
          setWrongFlash((n) => n + 1);
          versionRef.current = -1; // force refresh
          void refresh();
          return null;
        }
        if (!res.ok) return (data.error as string) ?? "Action failed.";
        versionRef.current = -1;
        void refresh();
        return null;
      } catch {
        return "Network hiccup. Try again.";
      }
    },
    [code, refresh]
  );

  return { room, error, send, wrongFlash, refresh };
}
