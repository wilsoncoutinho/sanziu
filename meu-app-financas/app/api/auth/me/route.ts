export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

type JwtPayload = { sub?: string; email?: string };

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
    const token = match?.[1];

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "AUTH_SECRET não configurado no .env" },
        { status: 500 }
      );
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, secret) as JwtPayload;
    } catch {
      // token inválido/expirado
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const userId = payload.sub;
    if (!userId) return NextResponse.json({ user: null }, { status: 200 });

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
