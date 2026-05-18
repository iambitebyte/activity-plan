"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import SessionModal from "@/components/SessionModal";

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

export default function SchedulePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [dates, setDates] = useState<{ value: string; label: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupLoading, setSignupLoading] = useState<string | null>(null);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions);
      setDates(data.dates);
      setUser(data.currentUser);
      if (data.dates.length > 0 && !selectedDate) {
        setSelectedDate(data.dates[0].value);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSignup = async (sessionId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }
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
  };

  const handleModalSignupChange = (sessionId: string, signedUp: boolean) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            isSignedUp: signedUp,
            signupCount: signedUp ? s.signupCount + 1 : s.signupCount - 1,
            signups: signedUp
              ? [...s.signups, { user_id: user!.id, display_name: user!.display_name }]
              : s.signups.filter((su) => su.user_id !== user!.id),
          };
        }
        return s;
      })
    );
  };

  const filteredSessions = sessions.filter((s) => s.date === selectedDate);
  const timeSlots = [...new Set(filteredSessions.map((s) => s.time))].sort();

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

  return (
    <div className="app-container">
      <Header user={user} currentPath="/" onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Day tabs */}
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

        {/* Sessions by time slot */}
        {timeSlots.map((slot) => {
          const slotSessions = filteredSessions.filter((s) => s.time === slot);
          return (
            <div key={slot} className="mb-8 animate-fade-in">
              {timeSlots.indexOf(slot) > 0 && <hr className="border-gray-300 mb-6 mx-2" />}
              <div className="flex items-center gap-3 mb-4">
                <span className="time-badge">{slot}</span>
                <span className="text-xs text-gray-400">{slotSessions.length} 场活动</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slotSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-xl border border-gray-200 p-5 card-hover cursor-pointer"
                    onClick={() => setModalSessionId(session.id)}
                  >
                    <div className="mb-3">
                      <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-2">
                        {session.topic}
                      </h3>
                      <p className="text-sm text-gray-500">{session.speaker}</p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className={`signup-badge ${session.isSignedUp ? "active" : ""}`}>
                          {session.signupCount} 人报名
                        </span>
                        {session.signupCount > 0 && (
                          <span className="text-xs text-gray-400 truncate max-w-[120px]">
                            {session.signups.map((s) => s.display_name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSignup(session.id);
                        }}
                        disabled={signupLoading === session.id}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          session.isSignedUp
                            ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            : "btn-primary text-white"
                        } disabled:opacity-50`}
                      >
                        {signupLoading === session.id
                          ? "..."
                          : session.isSignedUp
                          ? "取消报名"
                          : "报名参加"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalSessionId(session.id);
                        }}
                        className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-all"
                      >
                        详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredSessions.length === 0 && (
          <div className="text-center py-20 empty-state rounded-2xl">
            <p className="text-gray-400 text-lg">暂无活动安排</p>
          </div>
        )}
      </main>

      {modalSessionId && (
        <SessionModal
          sessionId={modalSessionId}
          user={user}
          onClose={() => setModalSessionId(null)}
          onSignupChange={handleModalSignupChange}
        />
      )}
    </div>
  );
}
