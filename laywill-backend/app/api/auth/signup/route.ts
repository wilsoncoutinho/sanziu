export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateSixDigitCode, hashToken, isValidEmail, normalizeEmail } from "@/lib/security";
import { isEmailConfigured, sendEmail, verificationEmailTemplate } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name =
      typeof body.name === "string" && body.name.trim() !== ""
        ? body.name.trim()
        : null;

    const email =
      typeof body.email === "string"
        ? normalizeEmail(body.email)
        : "";

    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: "Servico de email nao configurado" },
        { status: 503 }
      );
    }

    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return NextResponse.json({ error: "Email ja cadastrado" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: passwordHash,
          emailVerifiedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: name ? `Casa de ${name}` : "Financas do Casal",
          currency: "BRL",
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
        select: {
          id: true,
          name: true,
          currency: true,
        },
      });

      return { user, workspace };
    });

    const secret = process.env.AUTH_SECRET ?? "dev_secret";
    const code = generateSixDigitCode();
    const codeHash = hashToken(code, secret);

    await prisma.emailVerificationCode.create({
      data: {
        userId: result.user.id,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const tpl = verificationEmailTemplate(code);
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });

    return NextResponse.json({ ...result, needsVerification: true }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
