"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { Logo } from "./logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line
        bg-surface/60 backdrop-blur-xl lg:flex"
      aria-label="Primary"
    >
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                "transition-colors duration-150",
                active ? "text-accent" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-accent-soft"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                className={cn(
                  "relative h-5 w-5 shrink-0 transition-transform duration-200",
                  !active && "group-hover:scale-110"
                )}
                aria-hidden
              />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-line px-5 py-4">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
            )
          }
          className="flex w-full items-center justify-between rounded-md border border-line px-3 py-1.5
            text-xs text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
        >
          Jump anywhere
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>
        <div className="flex items-center justify-between">
          <p className="text-xs text-fg-subtle">Theme</p>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
