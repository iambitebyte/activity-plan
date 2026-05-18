import { NextResponse } from "next/server";
import { getUserByUsername } from "@/lib/db";
import { verifyPassword, generateToken, setSessionCookie } from "@/lib/auth";
import { createSession } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "请填写用户名和密码" }, { status: 400 });
    }

    const user = getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const token = generateToken();
    createSession(token, user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, username: user.username, display_name: user.display_name },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
