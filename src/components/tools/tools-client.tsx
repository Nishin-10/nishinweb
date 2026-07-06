"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Copy, Check, Download, FileText, FileUp, Loader2, PenLine, ScanText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { downloadDocx, downloadPdf } from "@/lib/export";
import { getModelPref, ModelPicker } from "@/components/ui/model-picker";

type Tab = "summarize" | "write";

function ResultPane({ result, filename }: { result: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-surface-2/50 p-4 text-sm leading-relaxed">
        {result}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" onClick={() => downloadDocx(result, filename)}>
          <Download className="h-4 w-4" /> DOCX
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadPdf(result, filename)}>
          <Download className="h-4 w-4" /> PDF
        </Button>
      </div>
    </motion.div>
  );
}

export function ToolsClient() {
  const [tab, setTab] = useState<Tab>("summarize");

  // Summarizer state
  const [docText, setDocText] = useState("");
  const [docName, setDocName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  // Writer state
  const [instructions, setInstructions] = useState("");
  const [reference, setReference] = useState("");
  const [draft, setDraft] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/cv/parse", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "Upload failed.");
      setDocText(data.text);
      setDocName(file.name);
      setSummary(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const run = async (mode: Tab) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "summarize"
            ? { mode, text: docText, provider: getModelPref() }
            : { mode, instructions, text: reference, provider: getModelPref() }
        ),
      });
      const data = (await res.json()) as { result?: string; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "Request failed.");
      if (mode === "summarize") setSummary(data.result);
      else setDraft(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-end">
        <ModelPicker className="w-56" />
      </div>
      <div role="tablist" aria-label="Tools" className="mb-6 flex gap-1 rounded-md bg-surface-2 p-1 sm:w-fit">
        {(
          [
            ["summarize", "Summarizer", ScanText],
            ["write", "Doc writer", PenLine],
          ] as [Tab, string, typeof ScanText][]
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
              tab === key ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          {tab === "summarize" ? (
            <Card>
              <CardHeader>
                <CardTitle>Summarize anything</CardTitle>
                <CardDescription>
                  Paste text or upload a PDF, DOCX or TXT. You get the gist, the
                  key points, and anything worth double-checking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                    Upload file
                  </Button>
                  {docName && (
                    <span className="flex items-center gap-1.5 text-sm text-fg-muted">
                      <FileText className="h-4 w-4 text-accent" aria-hidden /> {docName}
                    </span>
                  )}
                </div>
                <Textarea
                  value={docText}
                  onChange={(e) => {
                    setDocText(e.target.value);
                    setDocName(null);
                  }}
                  placeholder="…or paste the text here"
                  className="min-h-44"
                  aria-label="Text to summarize"
                />
                <Button onClick={() => run("summarize")} disabled={busy || docText.trim().length < 40}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
                  Summarize
                </Button>
                {error && <p className="text-sm text-danger">{error}</p>}
                {summary && <ResultPane result={summary} filename="Summary" />}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Draft a document</CardTitle>
                <CardDescription>
                  Describe what you need: an email, report, proposal, letter,
                  meeting notes. Placeholders you must fill appear in [brackets].
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder='e.g. "Polite email to my landlord asking to fix the heating, firm tone"'
                  aria-label="What to write"
                />
                <Textarea
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Optional: paste notes, bullet points or source material to base it on"
                  className="min-h-32"
                  aria-label="Reference material"
                />
                <Button onClick={() => run("write")} disabled={busy || instructions.trim().length < 10}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  Write it
                </Button>
                {error && <p className="text-sm text-danger">{error}</p>}
                {draft && <ResultPane result={draft} filename="Draft" />}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
