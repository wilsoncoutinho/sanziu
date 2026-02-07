export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdFromRequest, getWorkspaceIdForUser } from "@/lib/auth";

const DEFAULT_EXPENSE_CATEGORIES = [
  "Lanches",
  "Mercado",
  "Transporte",
  "Serviços",
  "Lazer",
  "Saúde",
  "Educação",
  "Eletrônicos",
  "Vestuário",
  "Casa",
  "Outros",
] as const;

function parseMonth(monthStr: string) {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return null;

  const [yStr, mStr] = monthStr.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1..12

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  return { start, end };
}

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

    const url = new URL(req.url);
    const month = url.searchParams.get("month");

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
    if (!month) {
      return NextResponse.json({ categories }, { status: 200 });
    }

    const range = parseMonth(month);
    if (!range) {
      return NextResponse.json(
        { error: "month inválido. Use YYYY-MM (ex: 2026-02)" },
        { status: 400 }
      );
    }

    const usage = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        workspaceId,
        type: "EXPENSE",
        categoryId: { not: null },
        date: { gte: range.start, lt: range.end },
      },
      _count: { categoryId: true },
    });

    const usageMap = new Map(
      usage.map((u) => [u.categoryId as string, u._count.categoryId])
    );

    const categoriesWithUsage = categories.map((c) => ({
      ...c,
      usageCount: usageMap.get(c.id) ?? 0,
    }));

    return NextResponse.json({ categories: categoriesWithUsage }, { status: 200 });
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
    const seed = body?.seed === true;

    if (seed) {
      const data = DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
        name,
        type: "EXPENSE" as const,
        workspaceId,
      }));
      const result = await prisma.category.createMany({
        data,
        skipDuplicates: true,
      });

      return NextResponse.json({ created: result.count }, { status: 201 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";

    const type = body.type === "EXPENSE" ? body.type : null;

    if (!name) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Tipo da categoria deve ser EXPENSE" },
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
