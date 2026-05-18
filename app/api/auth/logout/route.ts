import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";
import { getSessionToken, clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    const token = await getSessionToken();
    if (token) {
      deleteSession(token);
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "退出失败" }, { status: 500 });
  }
}
