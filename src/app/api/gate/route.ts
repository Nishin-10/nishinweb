import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function gateToken(passphrase: string): string {
  return createHash("sha256").update(`${passphrase}:companion-gate-v1`).digest("hex");
}

export async function POST(request: Request) {
  const expected = process.env.ACCESS_PASSPHRASE;
  if (!expected) {
    return NextResponse.json({ ok: true, open: true });
  }

  const { passphrase } = (await request.json()) as { passphrase?: string };
  const given = Buffer.from(String(passphrase ?? ""));
  const want = Buffer.from(expected);

  const match = given.length === want.length && timingSafeEqual(given, want);
  if (!match) {
    return NextResponse.json({ error: "Wrong passphrase." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("companion-gate", gateToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}
