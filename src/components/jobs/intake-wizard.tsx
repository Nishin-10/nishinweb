"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { careerStore, type CareerProfile } from "@/lib/career";

/* ---------- small building blocks ---------- */

function Chip({
  label,
  selected,
  onToggle,
  removable,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  removable?: boolean;
}) {
  return (
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.94 }}
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        selected
          ? "border-accent bg-accent-soft text-accent"
          : "border-line text-fg-muted hover:border-line-strong hover:text-fg"
      )}
    >
      {selected && !removable && <Check className="h-3.5 w-3.5" aria-hidden />}
      {label}
      {removable && <X className="h-3.5 w-3.5" aria-hidden />}
    </motion.button>
  );
}

function ChipInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  const add = (value: string) => {
    const v = value.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
        />
        <Button
          variant="secondary"
          size="icon"
          aria-label="Add"
          onClick={() => add(draft)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <Chip
              key={v}
              label={v}
              selected
              removable
              onToggle={() => onChange(values.filter((x) => x !== v))}
            />
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions
            .filter((s) => !values.includes(s))
            .map((s) => (
              <Chip key={s} label={s} selected={false} onToggle={() => add(s)} />
            ))}
        </div>
      )}
    </div>
  );
}

/* ---------- wizard ---------- */

const ROLE_SUGGESTIONS = [
  "Software Engineer",
  "Data Scientist",
  "Data Engineer",
  "ML Engineer",
  "Product Manager",
  "UX Designer",
  "DevOps Engineer",
];
const INDUSTRIES = [
  "Tech",
  "Energy",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Media",
  "Government",
];
const SENIORITY = ["Intern", "Junior", "Mid-level", "Senior", "Lead", "Manager", "Director+"];
const WORK_MODES = ["Remote", "Hybrid", "Onsite"];
const INTEREST_SUGGESTIONS = [
  "AI / ML",
  "Open source",
  "Cloud",
  "Data visualization",
  "Cybersecurity",
  "Sustainability",
];

interface StepDef {
  title: string;
  hint: string;
  valid: (p: Draft) => boolean;
}

type Draft = Omit<CareerProfile, "completedAt">;

const emptyDraft: Draft = {
  roles: [],
  industries: [],
  seniority: "",
  workModes: [],
  locations: [],
  salary: "",
  interests: [],
};

const steps: StepDef[] = [
  {
    title: "What roles are you after?",
    hint: "Add one or more job titles. These drive the search.",
    valid: (p) => p.roles.length > 0,
  },
  {
    title: "Which industries appeal to you?",
    hint: "Pick any that fit. Skip freely, this only shapes suggestions.",
    valid: () => true,
  },
  {
    title: "Where are you in your career?",
    hint: "One pick. It tunes the tone of your tailored CV.",
    valid: (p) => p.seniority !== "",
  },
  {
    title: "How and where do you want to work?",
    hint: "Work mode plus cities or regions you'd consider.",
    valid: (p) => p.workModes.length > 0,
  },
  {
    title: "Salary expectations?",
    hint: "Free text, e.g. \"$90k+\", \"€60-75k\", or leave it open.",
    valid: () => true,
  },
  {
    title: "What are you into?",
    hint: "Interests help the assistant personalize recommendations later.",
    valid: () => true,
  },
];

export function IntakeWizard({ onDone }: { onDone: (p: CareerProfile) => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(
    () => {
      const existing = careerStore.getProfile();
      return existing
        ? { ...emptyDraft, ...existing }
        : emptyDraft;
    }
  );
  const [direction, setDirection] = useState(1);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const go = (delta: number) => {
    setDirection(delta);
    setStep((s) => Math.min(steps.length - 1, Math.max(0, s + delta)));
  };

  const finish = () => {
    const profile: CareerProfile = { ...draft, completedAt: new Date().toISOString() };
    careerStore.setProfile(profile);
    onDone(profile);
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="p-6 sm:p-8">
        {/* Progress */}
        <div
          className="mb-8 flex gap-1.5"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Step ${step + 1} of ${steps.length}`}
        >
          {steps.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className="h-full bg-accent"
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.35 }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: 32 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 * direction }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {current.title}
            </h2>
            <p className="mb-6 mt-1.5 text-sm text-fg-muted">{current.hint}</p>

            <div className="min-h-40">
              {step === 0 && (
                <ChipInput
                  values={draft.roles}
                  onChange={(roles) => patch({ roles })}
                  placeholder="e.g. Data Engineer"
                  suggestions={ROLE_SUGGESTIONS}
                />
              )}

              {step === 1 && (
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((ind) => (
                    <Chip
                      key={ind}
                      label={ind}
                      selected={draft.industries.includes(ind)}
                      onToggle={() =>
                        patch({
                          industries: draft.industries.includes(ind)
                            ? draft.industries.filter((x) => x !== ind)
                            : [...draft.industries, ind],
                        })
                      }
                    />
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-wrap gap-2">
                  {SENIORITY.map((level) => (
                    <Chip
                      key={level}
                      label={level}
                      selected={draft.seniority === level}
                      onToggle={() => patch({ seniority: level })}
                    />
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {WORK_MODES.map((mode) => (
                      <Chip
                        key={mode}
                        label={mode}
                        selected={draft.workModes.includes(mode)}
                        onToggle={() =>
                          patch({
                            workModes: draft.workModes.includes(mode)
                              ? draft.workModes.filter((x) => x !== mode)
                              : [...draft.workModes, mode],
                          })
                        }
                      />
                    ))}
                  </div>
                  <ChipInput
                    values={draft.locations}
                    onChange={(locations) => patch({ locations })}
                    placeholder="Add a city or region"
                  />
                </div>
              )}

              {step === 4 && (
                <Input
                  value={draft.salary}
                  onChange={(e) => patch({ salary: e.target.value })}
                  placeholder='e.g. "$90k+" or "negotiable"'
                />
              )}

              {step === 5 && (
                <ChipInput
                  values={draft.interests}
                  onChange={(interests) => patch({ interests })}
                  placeholder="Add an interest"
                  suggestions={INTEREST_SUGGESTIONS}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => go(-1)}
            disabled={step === 0}
            aria-label="Previous step"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {isLast ? (
            <Button onClick={finish} disabled={!current.valid(draft)}>
              Finish <Check className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => go(1)} disabled={!current.valid(draft)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
