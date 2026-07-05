import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { navItems } from "@/components/shell/nav-items";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Tilt } from "@/components/motion/tilt";
import { Hero } from "@/components/home/hero";
import { Card, CardContent } from "@/components/ui/card";

const sections = navItems.filter((item) => item.href !== "/");

export default function HomePage() {
  return (
    <div className="space-y-10">
      <Hero />

      <section aria-label="App sections">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-fg-subtle">
          The modules
        </p>
        <RevealGroup className="grid gap-4 sm:grid-cols-2">
          {sections.map((item, index) => {
            const Icon = item.icon;
            return (
              <RevealItem key={item.href}>
                <Tilt className="h-full">
                  <Link href={item.href} className="block h-full rounded-lg outline-offset-4">
                    <Card interactive className="group h-full">
                      <CardContent className="flex items-start gap-4">
                        <span
                          aria-hidden
                          className="font-display text-3xl font-bold text-fg/10 transition-colors duration-300 group-hover:text-accent/40"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
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
                </Tilt>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </section>
    </div>
  );
}
