"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Download,
  FileText,
  FileUp,
  Loader2,
  Mail,
  Wand2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { careerStore, type JobPosting } from "@/lib/career";
import { scanCv, type AtsReport } from "@/lib/ats";
import { downloadDocx, downloadPdf } from "@/lib/export";
import { DiffView } from "./diff-view";

type ResultTab = "diff" | "tailored" | "ats" | "letter";

function ScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const tone = score >= 75 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`${label}: ${score} out of 100`}>
        <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
        <motion.circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 1, ease: "easeOut" }}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="49" textAnchor="middle" className="fill-[var(--fg)] font-display text-lg font-bold">
          {score}
        </text>
      </svg>
      <span className="text-xs text-fg-subtle">{label}</span>
    </div>
  );
}

function AtsChecklist({ report }: { report: AtsReport }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">
          Keyword coverage: {Math.round(report.keywordRate * 100)}%
        </p>
        <div className="flex flex-wrap gap-1.5">
          {report.matched.map((k) => (
            <Badge key={k} tone="success">{k}</Badge>
          ))}
          {report.missing.map((k) => (
            <Badge key={k} tone="danger">{k}</Badge>
          ))}
        </div>
        {report.missing.length > 0 && (
          <p className="mt-2 text-xs text-fg-subtle">
            Red keywords appear in the posting but not in the CV. Work the honest ones in.
          </p>
        )}
      </div>
      <ul className="space-y-2">
        {report.checks.map((check) => (
          <li key={check.label} className="flex gap-2.5 text-sm">
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
            )}
            <div>
              <span className="font-medium">{check.label}.</span>{" "}
              <span className="text-fg-muted">{check.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CvStudio({
  job,
  onNeedJob,
}: {
  job: JobPosting | null;
  onNeedJob: () => void;
}) {
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvName, setCvName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailored, setTailored] = useState<string | null>(null);

  const [letter, setLetter] = useState<string | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);

  const [tab, setTab] = useState<ResultTab>("diff");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCvText(careerStore.getCv());
    setCvName(careerStore.getCvName());
    const last = careerStore.getLastTailor();
    if (last && job && last.jobTitle === job.title) {
      setTailored(last.tailoredCv);
      setLetter(last.coverLetter ?? null);
    }
  }, [job]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/cv/parse", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; filename?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "Upload failed.");
      careerStore.setCv(data.text, data.filename ?? file.name);
      setCvText(data.text);
      setCvName(data.filename ?? file.name);
      setTailored(null);
      setLetter(null);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const runTailor = async () => {
    if (!cvText || !job) return;
    setTailoring(true);
    setTailorError(null);
    try {
      const res = await fetch("/api/cv/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText,
          jobText: job.description,
          jobTitle: job.title,
          company: job.company,
          mode: "cv",
        }),
      });
      const data = (await res.json()) as { result?: string; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "Rewrite failed.");
      setTailored(data.result);
      setTab("diff");
      careerStore.setLastTailor({
        jobTitle: job.title,
        company: job.company,
        originalCv: cvText,
        tailoredCv: data.result,
        coverLetter: letter ?? undefined,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      setTailorError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setTailoring(false);
    }
  };

  const runLetter = async () => {
    if (!cvText || !job) return;
    setLetterLoading(true);
    setTailorError(null);
    try {
      const res = await fetch("/api/cv/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText: tailored ?? cvText,
          jobText: job.description,
          jobTitle: job.title,
          company: job.company,
          mode: "cover-letter",
        }),
      });
      const data = (await res.json()) as { result?: string; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "Letter generation failed.");
      setLetter(data.result);
      setTab("letter");
    } catch (e) {
      setTailorError(e instanceof Error ? e.message : "Letter generation failed.");
    } finally {
      setLetterLoading(false);
    }
  };

  const atsBefore = cvText && job ? scanCv(cvText, job.description) : null;
  const atsAfter = tailored && job ? scanCv(tailored, job.description) : null;
  const exportBase = job
    ? `CV ${job.title.replace(/[^\w\s-]/g, "").slice(0, 40)}`
    : "CV tailored";

  return (
    <div className="space-y-6">
      {/* Step 1: CV upload */}
      <Card>
        <CardHeader>
          <CardTitle>1 · Your CV</CardTitle>
          <CardDescription>
            PDF, DOCX or TXT. Parsed locally on your machine, stored only in this browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={cvText ? "outline" : "primary"}
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              {cvText ? "Replace CV" : "Upload CV"}
            </Button>
            {cvName && (
              <span className="flex items-center gap-1.5 text-sm text-fg-muted">
                <FileText className="h-4 w-4 text-accent" aria-hidden />
                {cvName}
                <Badge tone="success">parsed</Badge>
              </span>
            )}
          </div>
          {uploadError && <p className="mt-3 text-sm text-danger">{uploadError}</p>}
        </CardContent>
      </Card>

      {/* Step 2: the job */}
      <Card>
        <CardHeader>
          <CardTitle>2 · The job</CardTitle>
          {job ? (
            <CardDescription>
              {job.title} at {job.company} <Badge tone="cyan" className="ml-1">{job.source}</Badge>
            </CardDescription>
          ) : (
            <CardDescription>No job selected yet.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {job ? (
            <details>
              <summary className="cursor-pointer text-sm text-fg-muted hover:text-fg">
                View job description
              </summary>
              <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-surface-2/50 p-3 text-xs leading-relaxed text-fg-muted">
                {job.description}
              </p>
            </details>
          ) : (
            <Button variant="secondary" onClick={onNeedJob}>
              Pick a job from the search tab
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 3: tailor */}
      <Card>
        <CardHeader>
          <CardTitle>3 · Tailor & score</CardTitle>
          <CardDescription>
            Claude rewrites your CV for this posting in a plain, human voice, then the
            ATS scanner scores both versions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runTailor} disabled={!cvText || !job || tailoring}>
              {tailoring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Rewriting…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> {tailored ? "Rewrite again" : "Tailor my CV"}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={runLetter}
              disabled={!cvText || !job || letterLoading}
            >
              {letterLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Cover letter
            </Button>
            {atsBefore && (
              <div className="ml-auto flex items-center gap-4">
                <ScoreRing score={atsBefore.score} label="Before" />
                {atsAfter && <ScoreRing score={atsAfter.score} label="After" />}
              </div>
            )}
          </div>

          {tailorError && <p className="text-sm text-danger">{tailorError}</p>}

          {(tailored || letter || atsBefore) && (
            <div>
              {/* Result tabs */}
              <div role="tablist" aria-label="Results" className="mb-4 flex gap-1 rounded-md bg-surface-2 p-1">
                {(
                  [
                    ["diff", "Before / after"],
                    ["tailored", "Tailored CV"],
                    ["ats", "ATS report"],
                    ["letter", "Cover letter"],
                  ] as [ResultTab, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={cn(
                      "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                      tab === key
                        ? "bg-surface text-fg shadow-card"
                        : "text-fg-muted hover:text-fg"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "diff" &&
                (tailored && cvText ? (
                  <DiffView before={cvText} after={tailored} />
                ) : (
                  <p className="py-6 text-center text-sm text-fg-muted">
                    Run the tailor step to compare versions.
                  </p>
                ))}

              {tab === "tailored" &&
                (tailored ? (
                  <div className="space-y-4">
                    <pre className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-surface-2/50 p-4 font-mono text-xs leading-relaxed">
                      {tailored}
                    </pre>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => downloadDocx(tailored, exportBase)}>
                        <Download className="h-4 w-4" /> DOCX
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(tailored, exportBase)}>
                        <Download className="h-4 w-4" /> PDF
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-fg-muted">
                    No tailored version yet.
                  </p>
                ))}

              {tab === "ats" &&
                (atsAfter ? (
                  <AtsChecklist report={atsAfter} />
                ) : atsBefore ? (
                  <div>
                    <p className="mb-3 text-xs text-fg-subtle">
                      Scoring your current CV against this posting. Tailor it to see the improved score.
                    </p>
                    <AtsChecklist report={atsBefore} />
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-fg-muted">
                    Upload a CV and pick a job first.
                  </p>
                ))}

              {tab === "letter" &&
                (letter ? (
                  <div className="space-y-4">
                    <pre className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-surface-2/50 p-4 font-sans text-sm leading-relaxed">
                      {letter}
                    </pre>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => downloadDocx(letter, `Cover letter ${job?.company ?? ""}`)}>
                        <Download className="h-4 w-4" /> DOCX
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(letter, `Cover letter ${job?.company ?? ""}`)}>
                        <Download className="h-4 w-4" /> PDF
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-fg-muted">
                    Generate a cover letter with the button above.
                  </p>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
