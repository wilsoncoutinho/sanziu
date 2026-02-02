export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdFromRequest, getWorkspaceIdForUser } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getSessionUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const workspaceId = await getWorkspaceIdForUser(userId);
  if (!workspaceId)
    return NextResponse.json({ error: "Workspace nao encontrado" }, { status: 404 });

  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.toLowerCase() : null;

  const token = crypto.randomBytes(24).toString("hex");

  const invite = await prisma.workspaceInvite.create({
    data: {
      token,
      workspaceId,
      email,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
    },
  });

  return NextResponse.json({
    inviteLink: `meuapp://invite/${invite.token}`,
    token: invite.token,
    expiresAt: invite.expiresAt,
  });
}