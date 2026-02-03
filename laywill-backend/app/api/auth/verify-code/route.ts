export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, normalizeEmail } from "@/lib/security";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json({ error: "Email e codigo sao obrigatorios" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Codigo invalido" }, { status: 400 });
    }

    if (user.emailVerifiedAt) {
      const token = signToken(user.id);
      const res = NextResponse.json({ ok: true, token }, { status: 200 });
      res.cookies.set("session", token, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return res;
    }

    const secret = process.env.AUTH_SECRET ?? "dev_secret";
    const codeHash = hashToken(code, secret);

    const record = await prisma.emailVerificationCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.usedAt) {
      return NextResponse.json({ error: "Codigo invalido" }, { status: 400 });
    }

    if (record.expiresAt <= new Date()) {
      return NextResponse.json({ error: "Codigo expirado" }, { status: 410 });
    }

    if (record.codeHash !== codeHash) {
      return NextResponse.json({ error: "Codigo invalido" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.emailVerificationCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);

    const token = signToken(user.id);
    const res = NextResponse.json({ ok: true, token }, { status: 200 });
    res.cookies.set("session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
