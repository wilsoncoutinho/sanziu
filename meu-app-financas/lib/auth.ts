import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

type JwtPayload = { sub?: string; email?: string };

export async function getSessionUserIdFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  const token = match?.[1];

  if (!token) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function getWorkspaceIdForUser(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });

  return membership?.workspaceId ?? null;
}
