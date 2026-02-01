export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdFromRequest, getWorkspaceIdForUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const workspaceId = await getWorkspaceIdForUser(userId);
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    const categories = await prisma.category.findMany({
      where: { workspaceId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (err) {
    console.error("Categories GET error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const workspaceId = await getWorkspaceIdForUser(userId);
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    const body = await req.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const type =
      body.type === "INCOME" || body.type === "EXPENSE"
        ? body.type
        : null;

    if (!name) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Tipo da categoria deve ser INCOME ou EXPENSE" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        workspaceId,
        name,
        type,
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (err: any) {
    // Categoria duplicada (mesmo nome + tipo no mesmo workspace)
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Categoria já existe" },
        { status: 409 }
      );
    }

    console.error("Categories POST error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
