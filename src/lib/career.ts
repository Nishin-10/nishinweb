/**
 * Career domain types + single-user local persistence.
 * Everything lives in localStorage under "companion:" keys, so the app works
 * with zero backend state. Swap this module for a real DB layer if accounts
 * ever land.
 */

export interface CareerProfile {
  roles: string[];
  industries: string[];
  seniority: string;
  workModes: string[]; // remote | hybrid | onsite
  locations: string[];
  salary: string;
  interests: string[];
  completedAt: string;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  salary?: string;
  postedAt?: string;
  description: string; // plain text
}

export interface TailorResult {
  jobTitle: string;
  company: string;
  originalCv: string;
  tailoredCv: string;
  coverLetter?: string;
  createdAt: string;
}

const KEYS = {
  profile: "companion:career-profile",
  cv: "companion:cv-text",
  cvName: "companion:cv-filename",
  savedJobs: "companion:saved-jobs",
  lastTailor: "companion:last-tailor",
} as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const careerStore = {
  getProfile: () => read<CareerProfile>(KEYS.profile),
  setProfile: (p: CareerProfile) => write(KEYS.profile, p),
  clearProfile: () => window.localStorage.removeItem(KEYS.profile),

  getCv: () => read<string>(KEYS.cv),
  setCv: (text: string, filename: string) => {
    write(KEYS.cv, text);
    write(KEYS.cvName, filename);
  },
  getCvName: () => read<string>(KEYS.cvName),

  getSavedJobs: () => read<JobPosting[]>(KEYS.savedJobs) ?? [],
  saveJob: (job: JobPosting) => {
    const jobs = careerStore.getSavedJobs().filter((j) => j.id !== job.id);
    write(KEYS.savedJobs, [job, ...jobs].slice(0, 50));
  },
  removeJob: (id: string) => {
    write(
      KEYS.savedJobs,
      careerStore.getSavedJobs().filter((j) => j.id !== id)
    );
  },

  getLastTailor: () => read<TailorResult>(KEYS.lastTailor),
  setLastTailor: (t: TailorResult) => write(KEYS.lastTailor, t),
};

/** Deep links into portals that have no free API. */
export function portalLinks(query: string, location: string) {
  const q = encodeURIComponent(query);
  const l = encodeURIComponent(location);
  return [
    {
      name: "LinkedIn",
      url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`,
    },
    {
      name: "Indeed",
      url: `https://www.indeed.com/jobs?q=${q}&l=${l}`,
    },
    {
      name: "Glassdoor",
      url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}&locT=N`,
    },
    {
      name: "ZipRecruiter",
      url: `https://www.ziprecruiter.com/jobs-search?search=${q}&location=${l}`,
    },
    {
      name: "Google Jobs",
      url: `https://www.google.com/search?q=${q}+jobs+${l}&ibp=htl;jobs`,
    },
  ];
}
