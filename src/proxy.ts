// Demo gate (Rencana Teknis step 12): one shared Basic Auth password — NOT real authentication.
// Fail-closed: without DEMO_PASSWORD every page answers 500.
import { NextResponse, type NextRequest } from "next/server";

const USER = "juri";

// Constant-time comparison so the length/content of the password does not leak through timing.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return new NextResponse("DEMO_PASSWORD is not set", { status: 500 });

  const expected = `Basic ${btoa(`${USER}:${password}`)}`;
  const header = request.headers.get("authorization") ?? "";
  if (constantTimeEqual(header, expected)) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="demo", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
