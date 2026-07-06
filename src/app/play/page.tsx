import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PlayClient } from "@/components/play/play-client";

export const metadata: Metadata = { title: "Brain & Fun" };

export default function PlayPage() {
  return (
    <div>
      <PageHeader
        title="Brain & Fun"
        description="Sudoku, chess, 2048 and quick arcade breaks, with your stats tracked."
        emojis={["🎮", "♟️", "🧩", "🎲", "👾", "🕹️", "🧠", "🃏"]}
      />
      <PlayClient />
    </div>
  );
}
