"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { STAGES, getStageMeta, NO_STAGE } from "@/lib/stages";

interface SessionData {
  id: string;
  date: string;
  time: string;
  speaker: string;
  topic: string;
  track?: string;
  stages?: string[];
  activity?: string;
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

/** 一对多计数：阶段 -> 覆盖场次 */
function coverageBy(sessions: SessionData[]) {
  const map = new Map<string, SessionData[]>();
  for (const s of sessions) {
    const list = s.stages && s.stages.length > 0 ? s.stages : [NO_STAGE];
    for (const st of list) {
      if (!map.has(st)) map.set(st, []);
      map.get(st)!.push(s);
    }
  }
  return map;
}

export default function OverviewPage() {
  const router = useRouter();
  const [allSessions, setAllSessions] = useState<SessionData[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sessions");
        const data = await res.json();
        setAllSessions(data.sessions ?? []);
        setActivities(data.activities ?? []);
        // 默认选中最新活动
        if (data.activities?.length > 0) {
          setSelectedActivity(data.activities[data.activities.length - 1].id);
        }
        setUser(data.currentUser);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 仅统计选中活动内带阶段标签的数据
  const sessions = allSessions.filter(
    (s) => (s.activity ?? "") === selectedActivity && s.stages !== undefined
  );
  const selectedActivityName = activities.find((a) => a.id === selectedActivity)?.name ?? "";
  const coverage = coverageBy(sessions);
  const primary = new Map<string, number>();
  for (const s of sessions) {
    const st = s.stages && s.stages.length > 0 ? s.stages[0] : NO_STAGE;
    primary.set(st, (primary.get(st) ?? 0) + 1);
  }

  const dates = [...new Set(sessions.map((s) => s.date))].sort();
  const tracks = [...new Set(sessions.map((s) => s.track ?? "").filter(Boolean))];
  const speakers = [...new Set(sessions.map((s) => s.speaker))];
  const tagTotal = sessions.reduce((n, s) => n + (s.stages?.length ?? 0), 0);

  // 半天维度（DAY1 上午/下午 ...）
  const halfDays = dates.flatMap((d) => ["上午", "下午"].map((p) => ({ date: d, period: p })));
  const halfDayLabel = (d: string, p: string) =>
    `DAY${dates.indexOf(d) + 1} ${p}`;

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

  if (sessions.length === 0) {
    return (
      <div className="app-container">
        <Header user={user} currentPath="/overview" onLogout={async () => { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); }} />
        <main className="max-w-7xl mx-auto px-4 py-20 text-center empty-state rounded-2xl">
          <p className="text-gray-400 text-lg">暂无带阶段标签的演讲数据</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header user={user} currentPath="/overview" onLogout={async () => { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); }} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* 活动选择（多场活动时显示） */}
        {activities.length > 1 && (
          <div className="flex items-center gap-2">
            {activities.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedActivity(a.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedActivity === a.id
                    ? "bg-gray-900 text-white shadow-md"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700"
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        {/* 标题 */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{selectedActivityName || "日程"} · 内容分布</h2>
          <p className="text-sm text-gray-500 mt-1">
            {sessions.length} 场主题演讲 × 软件工程生命周期阶段（一对多标签）。点击阶段可跳转到对应筛选的日程。
          </p>
        </div>

        {/* 总览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="主题演讲" value={sessions.length} suffix="场" />
          <StatCard label="生命周期阶段" value={STAGES.filter((s) => coverage.has(s)).length} suffix={`/ ${STAGES.length}`} />
          <StatCard label="专场" value={tracks.length} suffix="个" />
          <StatCard label="阶段标签" value={tagTotal} suffix={`个（均 ${(tagTotal / sessions.length).toFixed(1)} 个/场）`} />
        </div>

        {/* 生命周期流水线 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-1">🔄 研发流水线视角 —— 各阶段在本次大会中的角色与体量</h3>
          <p className="text-xs text-gray-400 mb-5">实心数字 = 覆盖场次（含次要阶段）；括号 = 主阶段场次</p>
          <div className="flex flex-col lg:flex-row items-stretch gap-2">
            {STAGES.map((stage, i) => {
              const meta = getStageMeta(stage);
              const n = coverage.get(stage)?.length ?? 0;
              const p = primary.get(stage) ?? 0;
              return (
                <div key={stage} className="flex-1 flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => router.push(`/?stage=${encodeURIComponent(stage)}`)}
                    className={`flex-1 text-left rounded-xl p-4 transition-all hover:scale-[1.03] hover:shadow-lg ${meta.solid} ${n === 0 ? "opacity-30" : ""}`}
                  >
                    <div className="text-lg">{meta.icon}</div>
                    <div className="font-bold text-sm mt-1">{stage}</div>
                    <div className="text-2xl font-extrabold mt-1">{n}<span className="text-xs font-normal opacity-80"> 场</span></div>
                    <div className="text-[11px] opacity-80 mt-0.5">主阶段 {p} 场</div>
                    <div className="text-[11px] opacity-80 mt-1 leading-snug">{meta.role}</div>
                  </button>
                  {i < STAGES.length - 1 && (
                    <span className="text-gray-300 text-lg font-bold hidden lg:block shrink-0">→</span>
                  )}
                </div>
              );
            })}
          </div>
          {(primary.get(NO_STAGE) ?? 0) > 0 && (
            <button
              onClick={() => router.push(`/?stage=${encodeURIComponent(NO_STAGE)}`)}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all"
            >
              {getStageMeta(NO_STAGE).icon} {NO_STAGE}：{primary.get(NO_STAGE)} 场（横跨全周期的组织/度量话题）
            </button>
          )}
        </section>

        {/* 阶段覆盖条形图 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-5">📊 阶段覆盖对比</h3>
          <div className="space-y-3">
            {[...coverage.entries()]
              .sort((a, b) => b[1].length - a[1].length)
              .map(([stage, list]) => {
                const meta = getStageMeta(stage);
                const pct = (list.length / sessions.length) * 100;
                const primPct = ((primary.get(stage) ?? 0) / sessions.length) * 100;
                return (
                  <div key={stage} className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push(`/?stage=${encodeURIComponent(stage)}`)}>
                    <span className="w-20 text-sm text-gray-600 font-medium shrink-0 text-right">{meta.icon} {stage}</span>
                    <div className="flex-1 h-7 bg-gray-50 rounded-md overflow-hidden flex relative">
                      <div className={`h-full ${meta.bar} opacity-40`} style={{ width: `${pct}%` }} />
                      <div
                        className={`h-full ${meta.bar} absolute top-0 left-0 transition-all`}
                        style={{ width: `${primPct}%` }}
                      />
                    </div>
                    <span className="w-16 text-sm text-gray-700 font-semibold shrink-0">
                      {list.length}
                      <span className="text-xs text-gray-400 font-normal">（主{primary.get(stage) ?? 0}）</span>
                    </span>
                  </div>
                );
              })}
          </div>
          <p className="text-xs text-gray-400 mt-4">深色 = 主阶段场次；浅色 = 覆盖场次（含次要阶段）。一场演讲可覆盖多个阶段。</p>
        </section>

        {/* 阶段 × 半天 热力矩阵 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-1">🗓️ 阶段 × 时段分布矩阵</h3>
          <p className="text-xs text-gray-400 mb-5">颜色越深表示该时段该阶段内容越多（点击格子跳转对应日程）</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-400 font-medium py-2 pr-4 w-24">阶段</th>
                  {halfDays.map((h) => (
                    <th key={`${h.date}${h.period}`} className="text-center text-xs text-gray-500 font-semibold py-2 px-2">
                      {halfDayLabel(h.date, h.period)}
                    </th>
                  ))}
                  <th className="text-center text-xs text-gray-400 font-medium py-2 pl-4">合计</th>
                </tr>
              </thead>
              <tbody>
                {[...STAGES, NO_STAGE].map((stage) => {
                  const meta = getStageMeta(stage);
                  const list = coverage.get(stage) ?? [];
                  if (list.length === 0) return null;
                  return (
                    <tr key={stage} className="border-t border-gray-100">
                      <td className={`py-2 pr-4 font-medium text-sm ${meta.text}`}>{meta.icon} {stage}</td>
                      {halfDays.map((h) => {
                        const n = list.filter(
                          (s) => s.date === h.date && (parseInt(s.time.slice(0, 2)) < 12 ? "上午" : "下午") === h.period
                        ).length;
                        const max = Math.max(...halfDays.map((hh) => list.filter(
                          (s) => s.date === hh.date && (parseInt(s.time.slice(0, 2)) < 12 ? "上午" : "下午") === hh.period
                        ).length), 1);
                        const intensity = n === 0 ? 0 : 0.15 + (n / max) * 0.85;
                        return (
                          <td key={`${h.date}${h.period}`} className="py-1.5 px-2 text-center">
                            <button
                              disabled={n === 0}
                              onClick={() => router.push(`/?stage=${encodeURIComponent(stage)}`)}
                              className={`w-full py-1.5 rounded-md text-sm font-semibold transition-all ${n > 0 ? `${meta.solid} hover:scale-105` : "text-gray-300"}`}
                              style={n > 0 ? { opacity: intensity } : undefined}
                            >
                              {n > 0 ? n : "·"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-2 pl-4 text-center font-bold text-gray-700">{list.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 专场 × 阶段 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-5">🎯 各专场的主阶段构成</h3>
          <div className="space-y-2.5">
            {tracks
              .map((track) => {
                const list = sessions.filter((s) => s.track === track);
                const stageCount = new Map<string, number>();
                for (const s of list) {
                  const st = s.stages && s.stages.length > 0 ? s.stages[0] : NO_STAGE;
                  stageCount.set(st, (stageCount.get(st) ?? 0) + 1);
                }
                return { track, list, stageCount };
              })
              .sort((a, b) => b.list.length - a.list.length)
              .map(({ track, list, stageCount }) => (
                <div key={track} className="flex items-center gap-3">
                  <span className="w-64 lg:w-80 text-xs text-gray-600 truncate shrink-0" title={track}>
                    {track}
                    <span className="text-gray-400">（{list.length}）</span>
                  </span>
                  <div className="flex-1 flex h-6 rounded-md overflow-hidden">
                    {[...STAGES, NO_STAGE].map((stage) => {
                      const n = stageCount.get(stage) ?? 0;
                      if (n === 0) return null;
                      const meta = getStageMeta(stage);
                      return (
                        <div
                          key={stage}
                          className={`${meta.bar} flex items-center justify-center text-[10px] text-white font-bold`}
                          style={{ width: `${(n / list.length) * 100}%` }}
                          title={`${stage}: ${n}`}
                        >
                          {n > 1 ? `${stage}${n}` : stage}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900">
        {value}
        {suffix && <span className="text-xs font-normal text-gray-400 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
