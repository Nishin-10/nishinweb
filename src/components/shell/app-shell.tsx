import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { AgentDock } from "./agent-dock";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <Topbar />
      <main className="pb-24 lg:pb-10 lg:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          {children}
        </div>
      </main>
      <MobileNav />
      <AgentDock />
    </div>
  );
}
