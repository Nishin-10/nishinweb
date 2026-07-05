"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { recFeedback, type RecItem } from "@/lib/recs";

export function RecCard({ item, index }: { item: RecItem; index: number }) {
  const [vote, setVote] = useState<boolean | null>(() => {
    const f = recFeedback.get(item.id);
    return f ? f.liked : null;
  });

  const cast = (liked: boolean) => {
    if (vote === liked) {
      recFeedback.clear(item.id);
      setVote(null);
    } else {
      recFeedback.set(item, liked);
      setVote(liked);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.35 }}
      className="h-full"
    >
      <Card interactive className="flex h-full flex-col overflow-hidden">
        {item.image && (
          <div className="relative h-40 overflow-hidden bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote hosts vary per API; plain img avoids remotePatterns churn */}
            <img
              src={item.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
            {item.rating !== undefined && (
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-amber-300">
                <Star className="h-3 w-3 fill-current" aria-hidden />
                {item.rating.toFixed(1)}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div>
            <h3 className="font-display font-semibold leading-snug tracking-tight">
              {item.title}
              {item.year ? <span className="ml-1.5 text-sm font-normal text-fg-subtle">({item.year})</span> : null}
            </h3>
            <p className="text-xs text-fg-muted">{item.subtitle}</p>
          </div>
          {item.blurb && (
            <p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">{item.blurb}</p>
          )}
          {item.meta && <Badge className="w-fit">{item.meta}</Badge>}

          <div className="mt-auto flex items-center justify-between pt-2">
            <div className="flex flex-wrap gap-2">
              {item.links.slice(0, 3).map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  {link.label} <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ))}
            </div>
            <div className="flex gap-1" role="group" aria-label={`Rate ${item.title}`}>
              <button
                type="button"
                onClick={() => cast(true)}
                aria-pressed={vote === true}
                aria-label="More like this"
                className={cn(
                  "rounded-md p-1.5 transition-all hover:scale-110",
                  vote === true ? "bg-success-soft text-success" : "text-fg-subtle hover:text-fg"
                )}
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => cast(false)}
                aria-pressed={vote === false}
                aria-label="Less like this"
                className={cn(
                  "rounded-md p-1.5 transition-all hover:scale-110",
                  vote === false ? "bg-danger-soft text-danger" : "text-fg-subtle hover:text-fg"
                )}
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
