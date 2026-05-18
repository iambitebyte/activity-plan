import { NextResponse } from "next/server";
import { createUser } from "@/lib/db";
import { hashPassword, generateToken, setSessionCookie } from "@/lib/auth";
import { createSession } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { username, password, displayName } = await request.json();

    if (!username || !password || !displayName) {
      return NextResponse.json({ error: "请填写所有字段" }, { status: 400 });
    }

    if (username.length < 2 || username.length > 50) {
      return NextResponse.json({ error: "用户名长度需要 2-50 个字符" }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "密码至少需要 4 个字符" }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    let user;
    try {
      user = createUser(username, passwordHash, displayName);
    } catch (e: any) {
      if (e.message?.includes("UNIQUE")) {
        return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
      }
      throw e;
    }

    const token = generateToken();
    createSession(token, user.id);
    await setSessionCookie(token);

    return NextResponse.json({ user: { id: user.id, username: user.username, display_name: user.display_name } });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
