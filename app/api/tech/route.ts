import { NextResponse } from "next/server";
import { getTechMarkdown } from "@/lib/master-data";

/** GET /api/tech?activity=<活动文件夹名> —— 返回该活动的技术亮点分析（Markdown） */
export async function GET(request: Request) {
  try {
    const activity = new URL(request.url).searchParams.get("activity") ?? "";
    const content = getTechMarkdown(activity);
    if (content === null) {
      return NextResponse.json({ error: "该活动暂无技术亮点分析" }, { status: 404 });
    }
    return NextResponse.json({ activity, content });
  } catch (error) {
    console.error("Tech markdown error:", error);
    return NextResponse.json({ error: "获取技术亮点分析失败" }, { status: 500 });
  }
}
