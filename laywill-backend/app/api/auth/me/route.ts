export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdFromRequest, getWorkspaceIdForUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // getSessionUserIdFromRequest tenta primeiro header Authorization: Bearer <token>
    // e depois cookie `token` — isso unifica o comportamento das rotas.
    const userId = await getSessionUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) return NextResponse.json({ user: null }, { status: 200 });

    const workspaceId = await getWorkspaceIdForUser(userId);
    let coupleName: string | null = null;

    if (workspaceId) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        select: { user: { select: { id: true, name: true, email: true } } },
      });

      const names = members
        .map((m) => m.user)
        .filter(Boolean)
        .map((u) => u.name?.trim() || u.email || "Usuário");

      // move current user to the front if present
      const meIndex = members.findIndex((m) => m.user?.id === userId);
      if (meIndex > -1 && names.length > 1) {
        const [me] = names.splice(meIndex, 1);
        names.unshift(me);
      }

      coupleName = names.join(" & ");
    }

    return NextResponse.json({ user, coupleName }, { status: 200 });
  } catch (err) {
    console.error("Me error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
