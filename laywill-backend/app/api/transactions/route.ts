export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdFromRequest, getWorkspaceIdForUser } from "@/lib/auth";

function parseMonth(monthStr: string) {
  // Esperado: "2026-02"
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return null;

  const [yStr, mStr] = monthStr.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1..12

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // próximo mês

  return { start, end };
}

function parseAmount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value.replace(",", "."));
    return n;
  }
  return NaN;
}

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const workspaceId = await getWorkspaceIdForUser(userId);
    if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });

    const url = new URL(req.url);
    const month = url.searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "Parâmetro 'month' é obrigatório (formato YYYY-MM)" },
        { status: 400 }
      );
    }

    const range = parseMonth(month);
    if (!range) {
      return NextResponse.json(
        { error: "month inválido. Use YYYY-MM (ex: 2026-02)" },
        { status: 400 }
      );
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        workspaceId,
        date: {
          gte: range.start,
          lt: range.end,
        },
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        type: true,
        amount: true,
        date: true,
        description: true,
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, type: true } },
        createdAt: true,
      },
    });

    // Resumo do mês (entrada/saída)
    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      // Prisma Decimal pode vir como objeto com toString()
      const v = Number((t.amount as any)?.toString?.() ?? t.amount);
      if (t.type === "INCOME") income += v;
      else expense += v;
    }

    return NextResponse.json(
      {
        month,
        summary: {
          income,
          expense,
          net: income - expense,
        },
        transactions,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Transactions GET error:", err);
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

    const type = body.type === "INCOME" || body.type === "EXPENSE" ? body.type : null;
    const accountId = typeof body.accountId === "string" ? body.accountId : "";
    const categoryId = typeof body.categoryId === "string" ? body.categoryId : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;

    const amountNum = parseAmount(body.amount);
    if (!type) {
      return NextResponse.json({ error: "type deve ser INCOME ou EXPENSE" }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "accountId é obrigatório" }, { status: 400 });
    }
    if (type === "EXPENSE" && !categoryId) {
      return NextResponse.json({ error: "categoryId é obrigatório para despesas" }, { status: 400 });
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "amount inválido (use > 0)" }, { status: 400 });
    }

    // date: aceita ISO string ou usa "agora"
    let date = new Date();
    if (typeof body.date === "string") {
      const d = new Date(body.date);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "date inválida (use ISO, ex: 2026-02-01)" }, { status: 400 });
      }
      date = d;
    }

    // Valida se account e category pertencem ao workspace do casal
    const [account, category] = await Promise.all([
      prisma.account.findFirst({
        where: { id: accountId, workspaceId },
        select: { id: true, name: true },
      }),
      categoryId
        ? prisma.category.findFirst({
            where: { id: categoryId, workspaceId },
            select: { id: true, name: true, type: true },
          })
        : Promise.resolve(null),
    ]);

    if (!account) {
      return NextResponse.json({ error: "Conta não encontrada neste workspace" }, { status: 404 });
    }
    if (type === "EXPENSE") {
      if (!category) {
        return NextResponse.json({ error: "Categoria não encontrada neste workspace" }, { status: 404 });
      }

      // Regra: tipo da transação deve bater com tipo da categoria
      if (type !== category.type) {
        return NextResponse.json(
          { error: `Tipo da transação (${type}) não bate com tipo da categoria (${category.type})` },
          { status: 400 }
        );
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        workspaceId,
        type,
        amount: amountNum,
        date,
        description,
        accountId,
        categoryId: type === "EXPENSE" ? categoryId : null,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        date: true,
        description: true,
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, type: true } },
        createdAt: true,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    console.error("Transactions POST error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
