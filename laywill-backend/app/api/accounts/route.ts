export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdFromRequest, getWorkspaceIdForUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const workspaceId = await getWorkspaceIdForUser(userId);
    if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });

    const accounts = await prisma.account.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true, initialBal: true, createdAt: true },
    });

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (err) {
    console.error("Accounts GET error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const workspaceId = await getWorkspaceIdForUser(userId);
    if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });

    const body = await req.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "BANK";
    const initialBalRaw = body.initialBal;

    if (!name) {
      return NextResponse.json({ error: "Nome da conta é obrigatório" }, { status: 400 });
    }

    // Aceita número (ex: 100) ou string (ex: "100.50")
    const initialBal =
      typeof initialBalRaw === "number"
        ? initialBalRaw
        : typeof initialBalRaw === "string"
        ? Number(initialBalRaw.replace(",", "."))
        : 0;

    if (Number.isNaN(initialBal)) {
      return NextResponse.json({ error: "initialBal inválido" }, { status: 400 });
    }

    const account = await prisma.account.create({
      data: {
        workspaceId,
        name,
        type,
        initialBal,
      },
      select: { id: true, name: true, type: true, initialBal: true, createdAt: true },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    console.error("Accounts POST error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
