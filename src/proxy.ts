// Gerbang demo (Rencana Teknis Langkah 12): Basic Auth satu password bersama -- BUKAN autentikasi sungguhan.
// Fail-closed: tanpa DEMO_PASSWORD semua halaman dijawab 500.
import { NextResponse, type NextRequest } from "next/server";

const USER = "juri";

// Perbandingan waktu-konstan agar panjang/isi password tidak bocor lewat timing.
function samaPersis(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const pw = process.env.DEMO_PASSWORD;
  if (!pw) return new NextResponse("DEMO_PASSWORD belum di-set", { status: 500 });

  const expected = `Basic ${btoa(`${USER}:${pw}`)}`;
  const header = request.headers.get("authorization") ?? "";
  if (samaPersis(header, expected)) return NextResponse.next();

  return new NextResponse("Butuh autentikasi", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="demo", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
