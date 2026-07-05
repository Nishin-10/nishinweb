import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { navItems } from "@/components/shell/nav-items";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const sections = navItems.filter((item) => item.href !== "/");

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <Reveal>
        <section
          className="relative overflow-hidden rounded-xl border border-line bg-surface p-8 shadow-card sm:p-12"
          aria-labelledby="hero-title"
        >
          {/* Ambient gradient orbs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full
              bg-[radial-gradient(circle,var(--accent-soft),transparent_65%)] animate-float"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full
              bg-[radial-gradient(circle,var(--accent-2-soft),transparent_65%)] animate-float
              [animation-delay:-3.5s]"
          />

          <div className="relative max-w-2xl">
            <Badge tone="accent" className="mb-4">
              Your personal AI companion
            </Badge>
            <h1
              id="hero-title"
              className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
            >
              Work sharper.
              <br />
              <span className="gradient-text">Unwind better.</span>
            </h1>
            <p className="mt-4 text-base text-fg-muted sm:text-lg">
              One place for the job hunt and the downtime after it: a CV that
              beats the tracking systems, films worth your evening, puzzles for
              your brain, and a daily read on where AI is heading.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Section cards */}
      <section aria-label="App sections">
        <RevealGroup className="grid gap-4 sm:grid-cols-2">
          {sections.map((item) => {
            const Icon = item.icon;
            return (
              <RevealItem key={item.href}>
                <Link href={item.href} className="block rounded-lg outline-offset-4">
                  <Card interactive className="group h-full">
                    <CardContent className="flex items-start gap-4">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg
                          bg-accent-soft text-accent transition-transform duration-300
                          group-hover:scale-110"
                      >
                        <Icon className="h-5.5 w-5.5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-display font-semibold tracking-tight">
                          {item.label}
                        </h2>
                        <p className="mt-1 text-sm text-fg-muted">{item.description}</p>
                      </div>
                      <ArrowRight
                        className="ml-auto h-5 w-5 shrink-0 self-center text-fg-subtle
                          transition-transform duration-300 group-hover:translate-x-1
                          group-hover:text-accent"
                        aria-hidden
                      />
                    </CardContent>
                  </Card>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </section>
    </div>
  );
}
