import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/master-data";
import { getSignupsBySession, getCommentsBySession, getUploadsBySession } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSessionById(id);
    if (!session) {
      return NextResponse.json({ error: "活动不存在" }, { status: 404 });
    }

    const signups = getSignupsBySession(id);
    const comments = getCommentsBySession(id);
    const uploads = getUploadsBySession(id);
    const user = await getCurrentUser();

    const isSignedUp = user ? signups.some((s) => s.user_id === user.id) : false;

    return NextResponse.json({
      session,
      signups: signups.map((s) => ({ user_id: s.user_id, display_name: s.display_name, username: s.username })),
      comments: comments.map((c) => ({
        id: c.id,
        user_id: c.user_id,
        display_name: c.display_name,
        content: c.content,
        created_at: c.created_at,
      })),
      isSignedUp,
      uploads: uploads.map((u) => ({
        id: u.id,
        user_id: u.user_id,
        display_name: u.display_name,
        original_name: u.original_name,
        file_size: u.file_size,
        created_at: u.created_at,
      })),
      currentUser: user
        ? { id: user.id, username: user.username, display_name: user.display_name }
        : null,
    });
  } catch (error) {
    console.error("Session detail error:", error);
    return NextResponse.json({ error: "获取活动详情失败" }, { status: 500 });
  }
}
