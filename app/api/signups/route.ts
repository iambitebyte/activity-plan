import { NextResponse } from "next/server";
import { createSignup, deleteSignup, getSignup } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: "缺少活动 ID" }, { status: 400 });
    }

    const existing = getSignup(user.id, sessionId);
    if (existing) {
      deleteSignup(user.id, sessionId);
      return NextResponse.json({ signedUp: false });
    } else {
      createSignup(user.id, sessionId);
      return NextResponse.json({ signedUp: true });
    }
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
