export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashToken, normalizeEmail } from "@/lib/security";
import { isEmailConfigured, resetPasswordEmailTemplate, sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

    if (!email) {
      return NextResponse.json({ error: "Email obrigatorio" }, { status: 400 });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: "Servico de email nao configurado" },
        { status: 503 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const secret = process.env.AUTH_SECRET ?? "dev_secret";
    const tokenHash = hashToken(rawToken, secret);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const appUrl = (process.env.APP_URL ?? "laywill://").replace(/\/+$/, "");
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`;
    const tpl = resetPasswordEmailTemplate(resetLink);
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
