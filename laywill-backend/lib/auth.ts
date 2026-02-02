import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

type JwtPayload = { sub?: string; email?: string };

// Prefer AUTH_SECRET; fall back to older AUTH_TOKEN_SECRET for compatibility.
const SECRET = process.env.AUTH_SECRET ?? process.env.AUTH_TOKEN_SECRET ?? "dev_secret";
const TOKEN_NAME = "token";

export function signToken(userId: string) {
  // use standard `sub` claim so verification helpers can read `payload.sub`
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  try {
    const payload = jwt.verify(token, SECRET) as any;
    return payload?.sub ?? payload?.userId ?? null;
  } catch {
    return null;
  }
}

function extractBearer(authorization?: string | null) {
  if (!authorization) return null;
  const m = authorization.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function extractCookieToken(cookieHeader?: string | null) {
  if (!cookieHeader) return null;
  // procura por cookie 'token' (ex: token=...)
  const match = cookieHeader.match(new RegExp(`(?:^|; )${TOKEN_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export async function getSessionUserIdFromRequest(req: Request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");

  // 1) Authorization: Bearer <token>  ✅ mobile
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  // 2) Cookie session  ✅ web/testes
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  const token = match?.[1];
  if (!token) return null;

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
