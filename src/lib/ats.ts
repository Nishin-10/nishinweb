/**
 * ATS-friendliness scanner. Pure functions, runs client-side.
 * Scores a CV against a job description on keyword coverage, structure and
 * formatting hazards that commonly break resume parsers.
 */

export interface AtsCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface AtsReport {
  score: number; // 0-100
  keywordRate: number; // 0-1
  matched: string[];
  missing: string[];
  checks: AtsCheck[];
}

const STOPWORDS = new Set(
  `a an and are as at be by for from has have in is it its of on or that the to was were will with you your we our they this their than then so if but not no yes do does did done can could should would may might must about into over under out up down more most less least very just also only such other own same each few both between through during before after above below all any per via etc within without across including strong ability experience work team job role candidate candidates applicants applicant company position responsibilities requirements qualifications preferred required years year skills skill knowledge including ideal plus bonus benefits salary apply equal opportunity employer`.split(
    /\s+/
  )
);

/** Multi-word tech/role terms worth matching as phrases. */
const PHRASES = [
  "machine learning", "deep learning", "data science", "data engineering",
  "project management", "product management", "customer success",
  "full stack", "front end", "back end", "ci/cd", "unit testing",
  "power bi", "google cloud", "version control", "rest api", "restful api",
  "natural language processing", "computer vision", "supply chain",
  "business intelligence", "stakeholder management", "agile", "scrum",
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

/** Pull the terms a recruiter or an ATS would actually look for. */
export function extractKeywords(jobText: string, limit = 24): string[] {
  const lower = jobText.toLowerCase();
  const found = new Map<string, number>();

  for (const phrase of PHRASES) {
    if (lower.includes(phrase)) found.set(phrase, 5);
  }

  const counts = new Map<string, number>();
  for (const token of tokenize(jobText)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]);

  for (const [word, n] of ranked) {
    if (found.size >= limit) break;
    if (![...found.keys()].some((p) => p.includes(word))) found.set(word, n);
  }
  return [...found.keys()].slice(0, limit);
}

export function scanCv(cvText: string, jobText: string): AtsReport {
  const cvLower = cvText.toLowerCase();
  const keywords = extractKeywords(jobText);
  const matched = keywords.filter((k) => cvLower.includes(k));
  const missing = keywords.filter((k) => !cvLower.includes(k));
  const keywordRate = keywords.length ? matched.length / keywords.length : 1;

  const checks: AtsCheck[] = [];

  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(cvText);
  const hasPhone = /(\+?\d[\d\s().-]{7,})/.test(cvText);
  checks.push({
    label: "Contact details present",
    passed: hasEmail && hasPhone,
    detail: hasEmail && hasPhone
      ? "Email and phone number found."
      : `Missing ${[!hasEmail && "an email address", !hasPhone && "a phone number"].filter(Boolean).join(" and ")}. Parsers pull these from the top of the file.`,
  });

  const sectionNames = ["experience", "education", "skills"];
  const foundSections = sectionNames.filter((s) =>
    new RegExp(`^\\s*(work\\s+)?${s}`, "im").test(cvText)
  );
  checks.push({
    label: "Standard section headers",
    passed: foundSections.length === sectionNames.length,
    detail:
      foundSections.length === sectionNames.length
        ? "Experience, Education and Skills headers all found."
        : `Add clear headers for: ${sectionNames.filter((s) => !foundSections.includes(s)).join(", ")}. ATS parsers map content by these names.`,
  });

  const suspicious = /[│┃┆|]{2,}|\t{2,}/.test(cvText);
  checks.push({
    label: "No table or column artifacts",
    passed: !suspicious,
    detail: suspicious
      ? "Text contains column-like artifacts. Multi-column layouts and tables scramble the reading order in many parsers. Use a single column."
      : "No multi-column or table artifacts detected.",
  });

  const bulletCount = (cvText.match(/^\s*[-•*]/gm) ?? []).length;
  checks.push({
    label: "Bullet points used",
    passed: bulletCount >= 5,
    detail:
      bulletCount >= 5
        ? `${bulletCount} bullet lines found.`
        : "Fewer than five bullet lines. Recruiters scan bullets, and parsers handle '-' bullets cleanly.",
  });

  const hasDates = /(20\d{2}|19\d{2})/.test(cvText);
  checks.push({
    label: "Dated experience",
    passed: hasDates,
    detail: hasDates
      ? "Years found in the text."
      : "No years detected. Every role needs a date range like 'Jan 2022 - Mar 2024'.",
  });

  const numbers = (cvText.match(/\d+([.,]\d+)?\s*(%|k\b|m\b|users|customers|projects|people|team|\$|€|£)/gi) ?? []).length;
  checks.push({
    label: "Quantified achievements",
    passed: numbers >= 3,
    detail:
      numbers >= 3
        ? `${numbers} quantified statements found.`
        : "Fewer than three quantified results. Add numbers: percentages, budgets, team sizes, timeframes.",
  });

  const words = cvText.split(/\s+/).length;
  checks.push({
    label: "Sensible length",
    passed: words >= 200 && words <= 1200,
    detail:
      words < 200
        ? `Only ${words} words. That reads as an incomplete CV.`
        : words > 1200
          ? `${words} words. Cut toward two pages; parsers and people both drop off.`
          : `${words} words, in the sweet spot.`,
  });

  const checksPassed = checks.filter((c) => c.passed).length;
  const score = Math.round(keywordRate * 55 + (checksPassed / checks.length) * 45);

  return { score, keywordRate, matched, missing, checks };
}
