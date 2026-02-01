export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "AUTH_SECRET não configurado no .env" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      secret,
      { expiresIn: "7d" }
    );

    const res = NextResponse.json(
      {
        user: { id: user.id, name: user.name, email: user.email },
      },
      { status: 200 }
    );

    // Cookie de sessão (HTTP only)
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // quando publicar, vira true (https)
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
