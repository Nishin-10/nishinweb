import { test } from "node:test";
import assert from "node:assert/strict";
import { extractKeywords, scanCv } from "../src/lib/ats.ts";

const JOB = `Senior Data Engineer. We need strong Python and SQL skills, Airflow
orchestration, machine learning exposure, and BigQuery. Python and SQL daily.
Airflow pipelines at scale. BigQuery warehousing. machine learning models.`;

const GOOD_CV = `Jane Doe
jane@example.com | +1 555 010 2030

SUMMARY
Data engineer, five years of Python, SQL and Airflow on BigQuery.

EXPERIENCE
Data Engineer, Acme - Jan 2021 - Present
- Built Python ETL processing 2M events daily
- Cut costs 30% via BigQuery partitioning
- Deployed machine learning feature pipelines for 40 users

EDUCATION
BS Computer Science, 2018

SKILLS
Python, SQL, Airflow, BigQuery`;

test("keywords come from the posting", () => {
  const kws = extractKeywords(JOB);
  assert.ok(kws.includes("machine learning"), "finds known phrases");
  assert.ok(kws.some((k) => k.includes("python")), "finds repeated terms");
});

test("a matching CV scores well and a junk one scores badly", () => {
  const good = scanCv(GOOD_CV, JOB);
  const bad = scanCv("I like turtles.", JOB);
  assert.ok(good.score >= 70, `good CV scored ${good.score}`);
  assert.ok(bad.score < 40, `junk CV scored ${bad.score}`);
  assert.ok(good.keywordRate > bad.keywordRate);
  assert.equal(good.checks.some((c) => !c.passed && c.label === "Contact details present"), false);
});
