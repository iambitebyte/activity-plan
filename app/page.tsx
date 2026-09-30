"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import SessionModal from "@/components/SessionModal";
import { STAGE_FILTER_OPTIONS, getStageMeta, NO_STAGE } from "@/lib/stages";

interface SessionData {
  id: string;
  date: string;
  activity: string;
  time: string;
  fullTime: string;
  speaker: string;
  topic: string;
  venue?: string;
  track?: string;
  producer?: string;
  speaker_title?: string;
  stages?: string[];
  stage_summary?: string;
  track_url?: string;
  signupCount: number;
  signups: { user_id: number; display_name: string }[];
  isSignedUp: boolean;
}

interface ActivityData {
  id: string;
  name: string;
  dates: string[];
}

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
}

/** 默认选中最新活动的第一天 */

export default function SchedulePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [dates, setDates] = useState<{ value: string; label: string }[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupLoading, setSignupLoading] = useState<string | null>(null);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>("");

  // 从 URL ?stage= 初始化阶段筛选（由内容分布页跳转）
  useEffect(() => {
    const stage = new URLSearchParams(window.location.search).get("stage");
    if (stage && STAGE_FILTER_OPTIONS.includes(stage)) {
      setSelectedStage(stage);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions);
      setDates(data.dates);
      setActivities(data.activities ?? []);
      setUser(data.currentUser);
      // 默认选中最新活动（列表末尾）及其第一天
      if (data.activities?.length > 0 && !selectedActivity) {
        const latest = data.activities[data.activities.length - 1];
        setSelectedActivity(latest.id);
        setSelectedDate((prev) => prev || latest.dates[0] || "");
      } else if (data.dates.length > 0 && !selectedDate) {
        setSelectedDate(data.dates[data.dates.length - 1].value);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedActivity, selectedDate]);

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

  const handleActivitySelect = (activityId: string) => {
    setSelectedActivity(activityId);
    const act = activities.find((a) => a.id === activityId);
    if (act && act.dates.length > 0) setSelectedDate(act.dates[0]);
  };

  const stageMatch = (s: SessionData) => {
    if (!selectedStage) return true;
    if (s.stages === undefined) return false; // 旧数据无阶段标签，不参与阶段筛选
    if (selectedStage === NO_STAGE) return s.stages.length === 0;
    return s.stages.includes(selectedStage);
  };

  const filteredSessions = sessions.filter((s) => s.date === selectedDate && stageMatch(s));
  const dateSessions = sessions.filter((s) => s.date === selectedDate);
  const timeSlots = [...new Set(filteredSessions.map((s) => s.time))].sort();
  const hasStageData = dateSessions.some((s) => s.stages !== undefined);

  // 当前活动下的日期 tab
  const activityDateSet = new Set(activities.find((a) => a.id === selectedActivity)?.dates ?? []);
  const visibleDates = selectedActivity
    ? dates.filter((d) => activityDateSet.has(d.value))
    : dates;

  // 各阶段在当前日期的场次（用于筛选栏计数，仅统计带阶段数据）
  const stageCounts = new Map<string, number>();
  if (hasStageData) {
    for (const s of dateSessions) {
      if (s.stages === undefined) continue;
      const list = s.stages.length > 0 ? s.stages : [NO_STAGE];
      for (const st of list) stageCounts.set(st, (stageCounts.get(st) ?? 0) + 1);
    }
  }

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
        {/* Activity tabs（多场活动时显示） */}
        {activities.length > 1 && (
          <div className="flex items-center gap-2 mb-3">
            {activities.map((a) => (
              <button
                key={a.id}
                onClick={() => handleActivitySelect(a.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedActivity === a.id
                    ? "bg-gray-900 text-white shadow-md"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700"
                }`}
              >
                {a.name}
                <span className={`ml-1.5 text-xs font-normal ${selectedActivity === a.id ? "text-gray-300" : "text-gray-400"}`}>
                  {a.dates.length}天
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Day tabs */}
        <div className="flex items-center gap-2 mb-4">
          {visibleDates.map((d) => (
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

        {/* Stage filter（仅本次带阶段数据的日期显示） */}
        {hasStageData && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-gray-400 mr-1">按阶段筛选</span>
          <button
            onClick={() => setSelectedStage("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !selectedStage
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400"
            }`}
          >
            全部 {dateSessions.length}
          </button>
          {STAGE_FILTER_OPTIONS.map((stage) => {
            const count = stageCounts.get(stage) ?? 0;
            if (count === 0) return null;
            const meta = getStageMeta(stage);
            const active = selectedStage === stage;
            return (
              <button
                key={stage}
                onClick={() => setSelectedStage(active ? "" : stage)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active ? meta.solid : `${meta.badge} hover:opacity-80`
                }`}
              >
                {meta.icon} {stage} {count}
              </button>
            );
          })}
        </div>
        )}

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
                      <p className="text-sm text-gray-500">
                        {session.speaker}
                        {session.speaker_title && (
                          <span className="text-gray-400">｜{session.speaker_title}</span>
                        )}
                      </p>
                      {(session.track || session.venue) && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {session.track && <>📌 {session.track}</>}
                          {session.track && session.venue && <span className="mx-1.5">·</span>}
                          {session.venue && <>📍 {session.venue}</>}
                        </p>
                      )}
                    </div>

                    {session.stages && session.stages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {session.stages.slice(0, 3).map((st, i) => {
                          const meta = getStageMeta(st);
                          return (
                            <span
                              key={st}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                i === 0 ? meta.solid : meta.badge
                              }`}
                            >
                              {st}
                            </span>
                          );
                        })}
                        {session.stages.length > 3 && (
                          <span className="text-[11px] text-gray-400 self-center">
                            +{session.stages.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {session.stage_summary && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-1 pl-2 border-l-2 border-gray-200">
                        {session.stage_summary}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className={`signup-badge ${session.isSignedUp ? "active" : ""}`}>
                          {session.signupCount} 人报名
                        </span>
                        {session.signupCount > 0 && (
                          <span className="text-xs text-gray-900 font-bold truncate max-w-[120px]">
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
            <p className="text-gray-400 text-lg">
              {selectedStage ? `当前日期没有「${selectedStage}」相关的演讲` : "暂无活动安排"}
            </p>
            {selectedStage && (
              <button
                onClick={() => setSelectedStage("")}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                清除阶段筛选
              </button>
            )}
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
