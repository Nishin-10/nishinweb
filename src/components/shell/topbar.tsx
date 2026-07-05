"use client";

import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { navItems } from "./nav-items";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Topbar() {
  const pathname = usePathname();
  const current =
    navItems.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    ) ?? navItems[0];

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line px-4 sm:px-6 lg:hidden">
      <Logo />
      <div className="flex items-center gap-2">
        <span className="text-sm text-fg-muted">{current.label}</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
