export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSixDigitCode, hashToken, normalizeEmail } from "@/lib/security";
import { sendEmail, verificationEmailTemplate } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

    if (!email) {
      return NextResponse.json({ error: "Email obrigatorio" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const secret = process.env.AUTH_SECRET ?? "dev_secret";
    const code = generateSixDigitCode();
    const codeHash = hashToken(code, secret);

    await prisma.emailVerificationCode.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const tpl = verificationEmailTemplate(code);
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Resend code error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
