export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name =
      typeof body.name === "string" && body.name.trim() !== ""
        ? body.name.trim()
        : null;

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password = typeof body.password === "string" ? body.password : "";

    // Validações básicas (MVP)
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Verifica se já existe usuário
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 409 }
      );
    }

    // Criptografa a senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Cria usuário + workspace em transação
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: passwordHash,
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
          name: name ? `Casa de ${name}` : "Finanças do Casal",
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

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
