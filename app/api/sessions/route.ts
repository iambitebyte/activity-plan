import { NextResponse } from "next/server";
import { loadSessions, getDates, getActivities, formatDisplayDate } from "@/lib/master-data";
import { getAllSignups } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const sessions = loadSessions();
    const dates = getDates();
    const activities = getActivities();
    const allSignups = getAllSignups();
    const user = await getCurrentUser();

    const signupMap = new Map<string, { user_id: number; display_name: string }[]>();
    for (const s of allSignups) {
      const list = signupMap.get(s.session_id) || [];
      list.push({ user_id: s.user_id, display_name: s.display_name });
      signupMap.set(s.session_id, list);
    }

    const userSignupSet = new Set<string>();
    if (user) {
      for (const s of allSignups) {
        if (s.user_id === user.id) {
          userSignupSet.add(s.session_id);
        }
      }
    }

    const sessionsWithSignups = sessions.map((s) => ({
      ...s,
      signupCount: signupMap.get(s.id)?.length || 0,
      signups: signupMap.get(s.id) || [],
      isSignedUp: userSignupSet.has(s.id),
    }));

    const datesFormatted = dates.map((d) => ({
      value: d,
      label: formatDisplayDate(d),
    }));

    return NextResponse.json({
      sessions: sessionsWithSignups,
      dates: datesFormatted,
      activities,
      currentUser: user
        ? { id: user.id, username: user.username, display_name: user.display_name }
        : null,
    });
  } catch (error) {
    console.error("Sessions error:", error);
    return NextResponse.json({ error: "获取日程失败" }, { status: 500 });
  }
}
