import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { JobsClient } from "@/components/jobs/jobs-client";

export const metadata: Metadata = { title: "Jobs & CV" };

export default function JobsPage() {
  return (
    <div>
      <PageHeader
        title="Jobs & CV"
        description="Tell Companion what you're after, then let it find postings and tune your CV for each one."
      />
      <JobsClient />
    </div>
  );
}
