import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ToolsClient } from "@/components/tools/tools-client";

export const metadata: Metadata = { title: "Tools" };

export default function ToolsPage() {
  return (
    <div>
      <PageHeader
        title="Tools"
        description="Summarize any document, or have one drafted for you. Export as DOCX or PDF."
      />
      <ToolsClient />
    </div>
  );
}
