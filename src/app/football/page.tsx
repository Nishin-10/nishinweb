import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { FootballClient } from "@/components/football/football-client";

export const metadata: Metadata = { title: "Football" };

export default function FootballPage() {
  return (
    <div>
      <PageHeader
        title="Football"
        description="World Cup 2026 front and center, every big league a tap away. Scores refresh live."
      />
      <FootballClient />
    </div>
  );
}
