"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "@/components/Header";

interface ActivityData {
  id: string;
  name: string;
  dates: string[];
  hasTech: boolean;
}

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
}

const markdownComponents = {
  h1: (props: React.ComponentProps<"h1">) => (
    <h1 className="text-2xl font-extrabold text-gray-900 mb-2" {...props} />
  ),
  h2: (props: React.ComponentProps<"h2">) => (
    <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b-2 border-gray-100" {...props} />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="text-base font-bold text-gray-800 mt-6 mb-3" {...props} />
  ),
  h4: (props: React.ComponentProps<"h4">) => (
    <h4 className="text-sm font-bold text-gray-700 mt-4 mb-2" {...props} />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="text-sm text-gray-600 leading-7 my-3" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="list-disc pl-6 my-3 space-y-1.5 text-sm text-gray-600" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="list-decimal pl-6 my-3 space-y-1.5 text-sm text-gray-600" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => <li className="leading-7" {...props} />,
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-gray-900" {...props} />
  ),
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote
      className="border-l-4 border-blue-300 bg-blue-50/60 rounded-r-lg pl-4 pr-3 py-1.5 my-4 text-sm text-gray-500 leading-6"
      {...props}
    />
  ),
  table: (props: React.ComponentProps<"table">) => (
    <div className="overflow-x-auto my-5 rounded-xl border border-gray-200">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  thead: (props: React.ComponentProps<"thead">) => (
    <thead className="bg-gray-50" {...props} />
  ),
  th: (props: React.ComponentProps<"th">) => (
    <th
      className="border-b border-gray-200 px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap"
      {...props}
    />
  ),
  td: (props: React.ComponentProps<"td">) => (
    <td className="border-t border-gray-100 px-3 py-2.5 text-gray-600 align-top leading-6" {...props} />
  ),
  hr: () => <hr className="my-8 border-gray-200" />,
  code: (props: React.ComponentProps<"code">) => (
    <code className="bg-gray-100 rounded px-1.5 py-0.5 text-[13px] text-pink-600" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a className="text-blue-600 hover:underline" target="_blank" rel="noreferrer" {...props} />
  ),
};

export default function TechPage() {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sessions");
        const data = await res.json();
        setUser(data.currentUser);
        const acts: ActivityData[] = data.activities ?? [];
        setActivities(acts);
        // 默认选中最新的带分析的活动
        const withTech = acts.filter((a) => a.hasTech);
        const pool = withTech.length > 0 ? withTech : acts;
        if (pool.length > 0) setSelectedActivity(pool[pool.length - 1].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedActivity) return;
    setContent("");
    (async () => {
      try {
        const res = await fetch(`/api/tech?activity=${encodeURIComponent(selectedActivity)}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.content ?? "");
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [selectedActivity]);

  const selected = activities.find((a) => a.id === selectedActivity);

  return (
    <div className="app-container">
      <Header user={user} currentPath="/tech" onLogout={async () => { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); }} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">加载中...</p>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-20 text-center empty-state rounded-2xl">
            <p className="text-gray-400 text-lg">暂无活动数据</p>
          </div>
        ) : (
          <>
            {/* 活动选择 */}
            {activities.length > 1 && (
              <div className="flex items-center gap-2 mb-6">
                {activities.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedActivity(a.id)}
                    disabled={!a.hasTech}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      selectedActivity === a.id
                        ? "bg-gray-900 text-white shadow-md"
                        : a.hasTech
                        ? "bg-white text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700"
                        : "bg-white text-gray-300 border border-gray-100 cursor-not-allowed"
                    }`}
                    title={a.hasTech ? undefined : "该活动暂无技术亮点分析"}
                  >
                    {a.name}
                    {!a.hasTech && <span className="ml-1.5 text-xs font-normal">暂无</span>}
                  </button>
                ))}
              </div>
            )}

            {content ? (
              <article className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {content}
                </ReactMarkdown>
              </article>
            ) : (
              selected && (
                <div className="py-20 text-center empty-state rounded-2xl">
                  <p className="text-gray-400 text-lg">{selected.name} 暂无技术亮点分析</p>
                  <p className="text-xs text-gray-400 mt-2">
                    在数据目录 {selected.id}/ 下放置 tech.md 即可展示
                  </p>
                </div>
              )
            )}
          </>
        )}
      </main>
    </div>
  );
}
