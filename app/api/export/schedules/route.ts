import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSignupsByUser } from "@/lib/db";
import { getSessionById } from "@/lib/master-data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const signups = getSignupsByUser(user.id);
  const data = signups.map((s) => {
    const session = getSessionById(s.session_id);
    return {
      uuid: s.uuid,
      session_id: s.session_id,
      session_topic: session?.topic ?? "",
      session_time: session?.fullTime ?? "",
      created_at: s.created_at,
    };
  });

  const payload = {
    version: 1,
    type: "schedules",
    exported_at: new Date().toISOString(),
    data,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="qecon-schedules-${user.username}.json"`,
    },
  });
}
