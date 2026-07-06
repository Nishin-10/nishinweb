"use client";

import { useRef, useState } from "react";
import { DatabaseBackup, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/** Everything the app stores locally lives under this prefix. */
const PREFIX = "companion:";

export function BackupCard() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const exportData = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) data[key] = window.localStorage.getItem(key)!;
    }
    const blob = new Blob(
      [JSON.stringify({ app: "companion", exportedAt: new Date().toISOString(), data }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `companion-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${Object.keys(data).length} items.`);
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as {
        app?: string;
        data?: Record<string, string>;
      };
      if (parsed.app !== "companion" || !parsed.data) {
        throw new Error("That file doesn't look like a Companion backup.");
      }
      let count = 0;
      for (const [key, value] of Object.entries(parsed.data)) {
        if (key.startsWith(PREFIX) && typeof value === "string") {
          window.localStorage.setItem(key, value);
          count++;
        }
      }
      setMessage(`Restored ${count} items. Reloading…`);
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed.");
    }
  };

  return (
    <Card className="mt-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseBackup className="h-4 w-4 text-accent" aria-hidden /> Backup & restore
        </CardTitle>
        <CardDescription>
          Your CV, profile, game stats, leaderboards and favorites live only in this
          browser. Export a backup before clearing data or switching devices.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importData(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" onClick={exportData}>
          <Download className="h-4 w-4" /> Export backup
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
          <Upload className="h-4 w-4" /> Restore backup
        </Button>
        {message && <span className="text-sm text-fg-muted">{message}</span>}
      </CardContent>
    </Card>
  );
}
