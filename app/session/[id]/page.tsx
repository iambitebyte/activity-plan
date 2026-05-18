"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";

interface SessionInfo {
  id: string;
  date: string;
  time: string;
  fullTime: string;
  speaker: string;
  topic: string;
}

interface SignupInfo {
  user_id: number;
  display_name: string;
  username: string;
}

interface CommentInfo {
  id: number;
  user_id: number;
  display_name: string;
  content: string;
  created_at: string;
}

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [signups, setSignups] = useState<SignupInfo[]>([]);
  const [comments, setComments] = useState<CommentInfo[]>([]);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupLoading, setSignupLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setSignups(data.signups);
        setComments(data.comments);
        setIsSignedUp(data.isSignedUp);
        setUser(data.currentUser);
      } else {
        setError(data.error || "加载失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSignup = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setSignupLoading(true);
    try {
      const res = await fetch("/api/signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSignedUp(data.signedUp);
        if (data.signedUp) {
          setSignups((prev) => [...prev, { user_id: user.id, display_name: user.display_name, username: user.username }]);
        } else {
          setSignups((prev) => prev.filter((s) => s.user_id !== user.id));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSignupLoading(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    setCommentLoading(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, content: commentText }),
      });
      if (res.ok) {
        setCommentText("");
        const detailRes = await fetch(`/api/sessions/${sessionId}`);
        const detailData = await detailRes.json();
        if (detailRes.ok) {
          setComments(detailData.comments);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setIsSignedUp(false);
    router.push("/");
  };

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

  if (error || !session) {
    return (
      <div className="app-container">
        <Header user={user} currentPath="" onLogout={handleLogout} />
        <main className="max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="empty-state rounded-2xl p-12">
            <p className="text-gray-500 text-lg mb-4">{error || "活动不存在"}</p>
            <button
              onClick={() => router.push("/")}
              className="btn-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold"
            >
              返回日程
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header user={user} currentPath="" onLogout={handleLogout} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Session info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 animate-fade-in">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-flex items-center gap-1 transition-colors"
          >
            &larr; 返回日程
          </button>

          <h1 className="text-xl font-bold text-gray-900 mb-3">{session.topic}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="time-badge">{session.time}</span>
            <span>|</span>
            <span className="font-medium text-gray-700">{session.speaker}</span>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">
                  已报名 {signups.length} 人
                </span>
                {signups.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {signups.map((s) => (
                      <span key={s.user_id} className="signup-badge">
                        {s.display_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleSignup}
                disabled={signupLoading}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
                  isSignedUp
                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    : "btn-primary text-white"
                }`}
              >
                {signupLoading ? "..." : isSignedUp ? "取消报名" : "报名参加"}
              </button>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-fade-in">
          <h2 className="text-lg font-bold text-gray-900 mb-5">活动感想</h2>

          {user && (
            <form onSubmit={handleComment} className="mb-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 input-field text-sm resize-none"
                rows={3}
                placeholder="分享你参加这场活动的感想..."
                required
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={commentLoading || !commentText.trim()}
                  className="btn-primary text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {commentLoading ? "提交中..." : "发表感想"}
                </button>
              </div>
            </form>
          )}

          {!user && (
            <div className="mb-6 p-4 rounded-lg bg-gray-50 text-center">
              <p className="text-sm text-gray-500">
                <button
                  onClick={() => router.push("/login")}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  登录
                </button>
                后可以发表感想
              </p>
            </div>
          )}

          {comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">暂无感想，来做第一个留言的人吧</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const grouped: { userId: number; name: string; initial: string; items: typeof comments }[] = [];
                for (const c of comments) {
                  const g = grouped.find((g) => g.userId === c.user_id);
                  if (g) {
                    g.items.push(c);
                  } else {
                    grouped.push({ userId: c.user_id, name: c.display_name, initial: c.display_name.charAt(0), items: [c] });
                  }
                }
                return grouped.map((g) => (
                  <div key={g.userId} className="p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                        {g.initial}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{g.name}</span>
                    </div>
                    <div className="space-y-2 pl-8">
                      {g.items.map((c) => (
                        <div key={c.id} className="border-l-2 border-blue-100 pl-3">
                          <p className="text-xs text-gray-400 mb-1">
                            {new Date(c.created_at + "Z").toLocaleString("zh-CN")}
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
