import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { DiscoverClient } from "@/components/discover/discover-client";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <div>
      <PageHeader
        title="Discover"
        description="Books, films and games picked for your mood, language and taste. Thumbs teach it what you like."
        emojis={["🎬", "📚", "🍿", "🎧", "✨", "🎭", "📖"]}
      />
      <DiscoverClient />
    </div>
  );
}
