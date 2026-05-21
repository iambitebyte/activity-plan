import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCommentsByUser } from "@/lib/db";
import { getSessionById } from "@/lib/master-data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const comments = getCommentsByUser(user.id);
  const data = comments.map((c) => {
    const session = getSessionById(c.session_id);
    return {
      uuid: c.uuid,
      session_id: c.session_id,
      session_topic: session?.topic ?? "",
      session_time: session?.fullTime ?? "",
      content: c.content,
      created_at: c.created_at,
    };
  });

  const payload = {
    version: 1,
    type: "reflections",
    exported_at: new Date().toISOString(),
    data,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="qecon-reflections-${user.username}.json"`,
    },
  });
}
