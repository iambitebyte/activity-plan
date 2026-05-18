import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getUserBySessionToken } from "./db";

const COOKIE_NAME = "qecon-session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const verifyHash = createHash("sha256").update(salt + password).digest("hex");
  return hash === verifyHash;
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;
  const user = getUserBySessionToken(token);
  return user ?? null;
}
