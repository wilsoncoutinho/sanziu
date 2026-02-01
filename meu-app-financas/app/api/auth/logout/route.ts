export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true }, { status: 200 });

  res.cookies.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // em produção vira true
    path: "/",
    maxAge: 0,
  });

  return res;
}
