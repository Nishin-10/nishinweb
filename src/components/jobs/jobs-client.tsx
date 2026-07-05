"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Search, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { careerStore, type CareerProfile, type JobPosting } from "@/lib/career";
import { IntakeWizard } from "./intake-wizard";
import { JobSearch } from "./job-search";
import { CvStudio } from "./cv-studio";

type Tab = "search" | "studio";

export function JobsClient() {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>("search");
  const [job, setJob] = useState<JobPosting | null>(null);

  useEffect(() => {
    setProfile(careerStore.getProfile());
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!profile || editing) {
    return (
      <IntakeWizard
        onDone={(p) => {
          setProfile(p);
          setEditing(false);
        }}
      />
    );
  }

  const pickJob = (j: JobPosting) => {
    setJob(j);
    setTab("studio");
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Jobs sections" className="flex gap-1 rounded-md bg-surface-2 p-1">
          {(
            [
              ["search", "Find jobs", Search],
              ["studio", "CV studio", Wand2],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors",
                tab === key ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit profile
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "search" ? (
            <JobSearch profile={profile} onTailor={pickJob} />
          ) : (
            <CvStudio job={job} onNeedJob={() => setTab("search")} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
