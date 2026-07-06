import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { NewsClient } from "@/components/news/news-client";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  return (
    <div>
      <PageHeader
        title="News"
        description="A daily briefing on AI, open models, Hugging Face and the big clouds."
        emojis={["📰", "🤖", "☁️", "⚡", "🛰️", "🔬"]}
      />
      <NewsClient />
    </div>
  );
}
