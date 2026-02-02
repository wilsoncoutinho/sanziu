export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // getSessionUserIdFromRequest tenta primeiro header Authorization: Bearer <token>
    // e depois cookie `token` — isso unifica o comportamento das rotas.
    const userId = await getSessionUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) return NextResponse.json({ user: null }, { status: 200 });

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error("Me error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
