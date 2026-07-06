"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { KeyRound, Loader2, Lock, ShieldCheck, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { celebrate } from "@/lib/confetti";

/* ---------------- fake SOC log stream ---------------- */

const EVENTS = [
  "FIREWALL  DROP    src={ip} dst=10.0.4.21:443 proto=tcp",
  "IDS       ALERT   sig=ET-2019401 severity=low src={ip}",
  "AUTH      DENY    user=anon ip={ip} reason=no_token",
  "WAF       BLOCK   path=/wp-admin.php ip={ip} rule=managed",
  "EDGE      GET     /api/news 200 12ms cache=HIT",
  "EDGE      POST    /api/cv/tailor 401 gate=locked",
  "SCAN      NOTICE  portsweep detected src={ip} banned=600s",
  "KV        OK      room:{hex} ttl=86400 v={n}",
  "TLS       INFO    handshake ok cipher=TLS_AES_256_GCM_SHA384",
  "AUTH      DENY    passphrase_mismatch attempts={n} ip={ip}",
  "CRON      RUN     feeds.refresh sources=7 ok=7",
  "GATE      WATCH   session cookie absent -> challenge",
  "SENTRY    TRACE   {hex}{hex} sampled=false",
  "RATELIMIT WARN    ip={ip} bucket=api tokens=0",
];

function randomIp() {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
}

function makeLine(): string {
  const t = new Date();
  const ts = t.toISOString().slice(11, 23);
  const template = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  return `${ts}  ${template
    .replaceAll("{ip}", randomIp())
    .replaceAll("{hex}", Math.random().toString(16).slice(2, 10))
    .replaceAll("{n}", String(Math.floor(Math.random() * 900) + 3))}`;
}

function SocBackdrop() {
  const reduce = useReducedMotion();
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (reduce) return;
    setLines(Array.from({ length: 26 }, makeLine));
    const t = setInterval(() => {
      setLines((prev) => [...prev.slice(-40), makeLine()]);
    }, 220);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#04070c]">
      {/* Log stream */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-4 font-mono text-[10px] leading-[1.7] text-[#3ddc84]/40 sm:text-[11px]"
        style={{
          maskImage: "linear-gradient(180deg, transparent, black 30%, black 78%, transparent)",
          WebkitMaskImage: "linear-gradient(180deg, transparent, black 30%, black 78%, transparent)",
        }}
      >
        {lines.map((line, i) => (
          <div key={i} className={line.includes("DENY") || line.includes("BLOCK") ? "text-[#ff5d5d]/45" : line.includes("ALERT") || line.includes("WARN") ? "text-[#f5c542]/40" : undefined}>
            {line}
          </div>
        ))}
      </div>

      {/* Hex rain column, right side */}
      <div className="absolute right-3 top-0 hidden h-full flex-col gap-1 py-6 font-mono text-[9px] text-[#2ed3e6]/25 md:flex">
        {Array.from({ length: 30 }, (_, i) => (
          <span key={i}>{(i * 2654435761 % 0xffffffff).toString(16).padStart(8, "0")}</span>
        ))}
      </div>

      {/* Radar sweep */}
      {!reduce && (
        <motion.div
          className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full opacity-20"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(61,220,132,0.5) 20deg, transparent 60deg)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Scanlines + vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.22) 2px, rgba(0,0,0,0.22) 4px)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.7))]" />
    </div>
  );
}

/* ---------------- gate form ---------------- */

function GateForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const denyRef = useRef<HTMLParagraphElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) throw new Error();
      setUnlocked(true);
      celebrate("win");
      setTimeout(() => router.replace(params.get("from") ?? "/"), 700);
    } catch {
      setError(true);
      setAttempts((n) => n + 1);
      setBusy(false);
      setTimeout(() => setError(false), 800);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.21, 0.62, 0.35, 1] }}
      className="relative w-full max-w-sm rounded-xl border border-[#3ddc84]/25 bg-black/60 p-8
        shadow-[0_0_60px_-15px_rgba(61,220,132,0.35)] backdrop-blur-md"
    >
      <motion.div
        animate={error ? { x: [0, -10, 10, -7, 7, -3, 0] } : {}}
        transition={{ duration: 0.45 }}
      >
        <p className="mb-5 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#3ddc84]/70">
          [ access control // companion-01 ]
        </p>

        <motion.span
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border
            ${unlocked ? "border-[#3ddc84] text-[#3ddc84]" : error ? "border-[#ff5d5d] text-[#ff5d5d]" : "border-[#3ddc84]/50 text-[#3ddc84]"}`}
          animate={unlocked ? { rotate: [0, -12, 0], scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          {unlocked ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
        </motion.span>

        <h1 className="text-center font-mono text-xl font-bold tracking-tight text-white">
          {unlocked ? "ACCESS GRANTED" : "SYSTEM LOCKED"}
          <motion.span
            aria-hidden
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="ml-1 text-[#3ddc84]"
          >
            _
          </motion.span>
        </h1>
        <p className="mb-6 mt-2 text-center font-mono text-xs text-white/50">
          {unlocked
            ? "> establishing session…"
            : "> identity unverified. enter passphrase to proceed."}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3ddc84]/60" />
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="passphrase"
              aria-label="Passphrase"
              aria-invalid={error}
              autoFocus
              className={`h-11 w-full rounded-md border bg-black/50 pl-9 pr-3 font-mono text-sm text-[#3ddc84]
                caret-[#3ddc84] transition-colors placeholder:text-white/25 focus:outline-none
                ${error ? "border-[#ff5d5d]" : "border-[#3ddc84]/30 focus:border-[#3ddc84]"}`}
            />
          </div>
          <Button
            type="submit"
            disabled={busy || !passphrase}
            className="w-full bg-[#3ddc84] font-mono text-black hover:bg-[#5ce8a0]"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {unlocked ? "WELCOME OPERATOR" : "AUTHENTICATE"}
          </Button>
          <p ref={denyRef} aria-live="polite" className="h-4 text-center font-mono text-[11px] text-[#ff5d5d]">
            {error ? `ACCESS DENIED — attempt ${attempts} logged` : attempts > 0 && !unlocked ? `${attempts} failed attempt${attempts > 1 ? "s" : ""} on record` : ""}
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function GatePage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <SocBackdrop />
      <Suspense>
        <GateForm />
      </Suspense>
    </div>
  );
}
