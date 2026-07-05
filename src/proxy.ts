import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";

/**
 * Access gate. When ACCESS_PASSPHRASE is set, every page and API route
 * requires the gate cookie (a hash of the passphrase). Leave the variable
 * unset to run the app open, e.g. for local development.
 */

function gateToken(passphrase: string): string {
  return createHash("sha256").update(`${passphrase}:companion-gate-v1`).digest("hex");
}

export function proxy(request: NextRequest) {
  const passphrase = process.env.ACCESS_PASSPHRASE;
  if (!passphrase) return NextResponse.next();

  const cookie = request.cookies.get("companion-gate")?.value;
  if (cookie === gateToken(passphrase)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Locked. Enter the passphrase first." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/gate";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except the gate itself, Next internals, and static files.
    "/((?!gate|api/gate|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
