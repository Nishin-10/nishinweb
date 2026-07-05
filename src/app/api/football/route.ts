import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** ESPN's public scoreboard API; no key required. */
const LEAGUES: Record<string, string> = {
  worldcup: "fifa.world",
  epl: "eng.1",
  laliga: "esp.1",
  bundesliga: "ger.1",
  seriea: "ita.1",
  ligue1: "fra.1",
  ucl: "uefa.champions",
  mls: "usa.1",
};

export interface Match {
  id: string;
  name: string;
  status: "pre" | "in" | "post";
  statusText: string;
  venue?: string;
  round?: string;
  kickoff?: string;
  home: { name: string; abbrev: string; score: string; logo?: string; winner?: boolean };
  away: { name: string; abbrev: string; score: string; logo?: string; winner?: boolean };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = LEAGUES[searchParams.get("league") ?? "worldcup"] ?? LEAGUES.worldcup;
  const date = searchParams.get("date") ?? ""; // YYYYMMDD

  const url = new URL(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`
  );
  if (date) url.searchParams.set("dates", date);

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ error: `Scores feed returned ${res.status}.` }, { status: 502 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any;

    /* eslint-disable @typescript-eslint/no-explicit-any -- ESPN's feed is an
       unversioned external shape; we narrow defensively at each access. */
    const matches: Match[] = (json.events ?? []).map((event: any) => {
      const comp = event.competitions?.[0] ?? {};
      const competitors: any[] = comp.competitors ?? [];
      const home = competitors.find((c) => c.homeAway === "home") ?? competitors[0] ?? {};
      const away = competitors.find((c) => c.homeAway === "away") ?? competitors[1] ?? {};
      const state = event.status?.type?.state ?? "pre";
      const team = (c: any) => ({
        name: c.team?.shortDisplayName ?? c.team?.displayName ?? "TBD",
        abbrev: c.team?.abbreviation ?? "—",
        score: c.score ?? "",
        logo: c.team?.logo,
        winner: c.winner === true,
      });
      return {
        id: String(event.id),
        name: event.name ?? "",
        status: state,
        statusText: event.status?.type?.shortDetail ?? "",
        venue: comp.venue?.fullName,
        round: comp.notes?.[0]?.headline ?? event.season?.slug,
        kickoff: event.date,
        home: team(home),
        away: team(away),
      };
    });

    return NextResponse.json({
      matches,
      leagueName: json.leagues?.[0]?.name ?? "Football",
      season: json.leagues?.[0]?.season?.displayName,
      day: json.day?.date,
    });
  } catch (err) {
    console.error("Football fetch failed:", err);
    return NextResponse.json({ error: "Could not reach the scores feed." }, { status: 502 });
  }
}
