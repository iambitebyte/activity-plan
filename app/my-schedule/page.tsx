"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";

interface SessionData {
  id: string;
  date: string;
  time: string;
  fullTime: string;
  speaker: string;
  topic: string;
  signupCount: number;
  signups: { user_id: number; display_name: string }[];
  isSignedUp: boolean;
}

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
}

export default function MySchedulePage() {
  return (
    <Suspense fallback={<div className="app-container flex items-center justify-center"><div className="text-center"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" /><p className="text-gray-500">加载中...</p></div></div>}>
      <MyScheduleContent />
    </Suspense>
  );
}

function MyScheduleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateFromUrl = searchParams.get("date");
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [dates, setDates] = useState<{ value: string; label: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupLoading, setSignupLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions);
      setDates(data.dates);
      setUser(data.currentUser);
      if (data.dates.length > 0 && !selectedDate) {
        const restored = dateFromUrl && data.dates.some((d: { value: string }) => d.value === dateFromUrl)
          ? dateFromUrl
          : data.dates[0].value;
        setSelectedDate(restored);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, dateFromUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Restore scroll position after content loads
  useEffect(() => {
    if (loading) return;
    const saved = sessionStorage.getItem("my-schedule-scroll");
    if (saved) {
      sessionStorage.removeItem("my-schedule-scroll");
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10));
      });
    }
  }, [loading]);

  const handleSignup = async (sessionId: string) => {
    if (!user) return;
    setSignupLoading(sessionId);
    try {
      const res = await fetch("/api/signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === sessionId) {
              const wasSignedUp = data.signedUp === false;
              return {
                ...s,
                isSignedUp: data.signedUp === true,
                signupCount: wasSignedUp ? s.signupCount - 1 : s.signupCount + 1,
                signups: wasSignedUp
                  ? s.signups.filter((su) => su.user_id !== user.id)
                  : [...s.signups, { user_id: user.id, display_name: user.display_name }],
              };
            }
            return s;
          })
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSignupLoading(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSessions((prev) => prev.map((s) => ({ ...s, isSignedUp: false })));
    router.push("/");
  };

  const [copied, setCopied] = useState(false);

  const handleCopySchedule = () => {
    const text = mySessions.map((s) => s.topic).join("\n");
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mySessions = sessions.filter((s) => s.isSignedUp && s.date === selectedDate);
  const timeSlots = [...new Set(mySessions.map((s) => s.time))].sort();

  if (loading) {
    return (
      <div className="app-container flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container">
        <Header user={null} currentPath="/my-schedule" onLogout={() => {}} />
        <main className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="empty-state rounded-2xl p-12">
            <p className="text-gray-500 mb-4">请先登录查看你的日程</p>
            <button
              onClick={() => router.push("/login")}
              className="btn-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold"
            >
              去登录
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header user={user} currentPath="/my-schedule" onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">我的日程</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">共报名 {sessions.filter((s) => s.isSignedUp).length} 场活动</span>
            {mySessions.length > 0 && (
              <button
                onClick={handleCopySchedule}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
              >
                {copied ? "已复制" : "拷贝日程"}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {dates.map((d) => (
            <button
              key={d.value}
              onClick={() => setSelectedDate(d.value)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedDate === d.value
                  ? "btn-primary text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {timeSlots.length === 0 ? (
          <div className="text-center py-20 empty-state rounded-2xl">
            <p className="text-gray-400 text-lg mb-2">该日期暂无报名活动</p>
            <button
              onClick={() => router.push("/")}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              去活动日程报名
            </button>
          </div>
        ) : (
          timeSlots.map((slot) => {
            const slotSessions = mySessions.filter((s) => s.time === slot);
            return (
              <div key={slot} className="mb-8 animate-fade-in">
                {timeSlots.indexOf(slot) > 0 && <hr className="border-gray-300 mb-6 mx-2" />}
                <div className="flex items-center gap-3 mb-4">
                  <span className="time-badge">{slot}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slotSessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-white rounded-xl border-2 border-blue-200 p-5"
                    >
                      <div className="mb-3">
                        <h3 className="font-bold text-gray-900 text-base mb-1">{session.topic}</h3>
                        <p className="text-sm text-gray-500">{session.speaker}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-blue-100">
                        <span className="signup-badge active">
                          {session.signupCount} 人报名
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const scrollY = window.scrollY;
                              sessionStorage.setItem("my-schedule-scroll", String(scrollY));
                              router.push(`/session/${session.id}?from=my-schedule&date=${selectedDate}`);
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            查看详情
                          </button>
                          <button
                            onClick={() => handleSignup(session.id)}
                            disabled={signupLoading === session.id}
                            className="px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                          >
                            {signupLoading === session.id ? "..." : "取消报名"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
