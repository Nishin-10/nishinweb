import { cn } from "@/lib/utils";

type Tone = "accent" | "cyan" | "success" | "warning" | "danger" | "neutral";

const tones: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  cyan: "bg-accent-2-soft text-accent-2",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-fg-muted",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
