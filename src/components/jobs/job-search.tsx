"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ClipboardPaste,
  ExternalLink,
  Loader2,
  Search,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  careerStore,
  portalLinks,
  type CareerProfile,
  type JobPosting,
} from "@/lib/career";

export function JobSearch({
  profile,
  onTailor,
}: {
  profile: CareerProfile;
  onTailor: (job: JobPosting) => void;
}) {
  const [query, setQuery] = useState(profile.roles[0] ?? "");
  const [location, setLocation] = useState(profile.locations[0] ?? "");
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Paste fallback
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteCompany, setPasteCompany] = useState("");
  const [pasteText, setPasteText] = useState("");

  useEffect(() => {
    setSavedIds(new Set(careerStore.getSavedJobs().map((j) => j.id)));
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/jobs/search?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`
      );
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = (await res.json()) as { jobs: JobPosting[] };
      setJobs(data.jobs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }, [query, location]);

  const toggleSave = (job: JobPosting) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(job.id)) {
        next.delete(job.id);
        careerStore.removeJob(job.id);
      } else {
        next.add(job.id);
        careerStore.saveJob(job);
      }
      return next;
    });
  };

  const submitPaste = () => {
    if (pasteText.trim().length < 80) return;
    onTailor({
      id: `pasted-${Date.now()}`,
      title: pasteTitle.trim() || "Pasted role",
      company: pasteCompany.trim() || "Unknown company",
      location: "",
      url: "",
      source: "Pasted",
      description: pasteText.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Role or keywords"
              aria-label="Role or keywords"
            />
          </div>
          <Input
            className="sm:w-52"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Location (optional)"
            aria-label="Location"
          />
          <Button onClick={search} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </CardContent>
      </Card>

      {/* Portal deep links */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-fg-subtle">Also search directly:</span>
        {portalLinks(query || profile.roles[0] || "", location).map((portal) => (
          <a
            key={portal.name}
            href={portal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs
              font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent"
          >
            {portal.name} <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ))}
      </div>

      {/* Paste fallback */}
      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between p-5 text-left"
          onClick={() => setPasteOpen((v) => !v)}
          aria-expanded={pasteOpen}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ClipboardPaste className="h-4 w-4 text-accent" aria-hidden />
            Found a posting elsewhere? Paste it here
          </span>
          <ChevronDown
            className={`h-4 w-4 text-fg-subtle transition-transform ${pasteOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        <AnimatePresence initial={false}>
          {pasteOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 px-5 pb-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                    placeholder="Job title"
                    aria-label="Job title"
                  />
                  <Input
                    value={pasteCompany}
                    onChange={(e) => setPasteCompany(e.target.value)}
                    placeholder="Company"
                    aria-label="Company"
                  />
                </div>
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the full job description here…"
                  className="min-h-36"
                  aria-label="Job description"
                />
                <Button onClick={submitPaste} disabled={pasteText.trim().length < 80}>
                  <Wand2 className="h-4 w-4" /> Use this job in the CV studio
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Results */}
      {loading && (
        <div className="space-y-3" aria-label="Loading results">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="text-sm text-danger">{error}</CardContent>
        </Card>
      )}

      {!loading && searched && !error && jobs.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-fg-muted">
            Nothing from the free feeds for that query. Try broader keywords, or use
            the portal links above and paste a posting in.
          </CardContent>
        </Card>
      )}

      {!loading && jobs.length > 0 && (
        <ul className="space-y-3" aria-label="Job results">
          {jobs.map((job, i) => {
            const isOpen = expanded === job.id;
            const isSaved = savedIds.has(job.id);
            return (
              <motion.li
                key={job.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.3 }}
              >
                <Card interactive className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="leading-snug">{job.title}</CardTitle>
                        <CardDescription>
                          {job.company}
                          {job.location && ` · ${job.location}`}
                          {job.salary && ` · ${job.salary}`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge tone="cyan">{job.source}</Badge>
                        {job.postedAt && <Badge>{job.postedAt}</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    {isOpen && (
                      <p className="mb-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-surface-2/50 p-3 text-xs leading-relaxed text-fg-muted">
                        {job.description || "No description provided. Open the posting for details."}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => onTailor(job)}>
                        <Wand2 className="h-4 w-4" /> Tailor CV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpanded(isOpen ? null : job.id)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? "Hide description" : "Description"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSave(job)}
                        aria-pressed={isSaved}
                        aria-label={isSaved ? "Remove from saved" : "Save job"}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="h-4 w-4 text-accent" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                        {isSaved ? "Saved" : "Save"}
                      </Button>
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm
                            font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                        >
                          Open posting <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
