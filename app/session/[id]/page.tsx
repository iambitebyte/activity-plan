"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import UploadSection from "@/components/UploadSection";

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

interface UploadInfo {
  id: number;
  user_id: number;
  display_name: string;
  original_name: string;
  file_size: number;
  created_at: string;
}

interface ImageInfo {
  id: number;
  user_id: number;
  display_name: string;
  original_name: string;
  created_at: string;
}

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
}

export default function SessionDetailPage() {
  return (
    <Suspense fallback={<div className="app-container flex items-center justify-center"><div className="text-center"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" /><p className="text-gray-500">加载中...</p></div></div>}>
      <SessionDetailContent />
    </Suspense>
  );
}

function SessionDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const from = searchParams.get("from");
  const date = searchParams.get("date");
  const backUrl = from === "my-schedule" ? `/my-schedule${date ? `?date=${date}` : ""}` : "/";

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [signups, setSignups] = useState<SignupInfo[]>([]);
  const [comments, setComments] = useState<CommentInfo[]>([]);
  const [uploads, setUploads] = useState<UploadInfo[]>([]);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupLoading, setSignupLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "uploads">("comments");
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setSignups(data.signups);
        setComments(data.comments);
        setUploads(data.uploads || []);
        setImages(data.images || []);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewIndex(null);
      if (previewIndex === null) return;
      if (e.key === "ArrowLeft" && previewIndex > 0) setPreviewIndex((i) => i! - 1);
      if (e.key === "ArrowRight" && previewIndex < images.length - 1) setPreviewIndex((i) => i! + 1);
    };
    if (previewIndex !== null) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [previewIndex, images.length]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      e.target.value = "";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("图片大小不能超过20MB");
      e.target.value = "";
      return;
    }

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("file", file);

      const res = await fetch("/api/images", { method: "POST", body: formData });
      if (res.ok) {
        const detailRes = await fetch(`/api/sessions/${sessionId}`);
        const detailData = await detailRes.json();
        if (detailRes.ok) {
          setImages(detailData.images || []);
        }
      } else {
        const data = await res.json();
        alert(data.error || "上传失败");
      }
    } catch {
      alert("上传失败");
    } finally {
      setImageUploading(false);
      e.target.value = "";
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
              onClick={() => router.push(backUrl)}
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Session info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 animate-fade-in">
          <button
            onClick={() => router.push(backUrl)}
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
                      <span key={s.user_id} className="signup-badge !text-gray-900 !font-bold">
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

        {/* Comments & Uploads */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-fade-in">
          <div className="flex gap-1 mb-5">
            <button
              onClick={() => setActiveTab("comments")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "comments"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              活动感想
            </button>
            <button
              onClick={() => setActiveTab("uploads")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "uploads"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              文件共享
            </button>
          </div>

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div>
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
                  <div className="flex justify-end items-center mt-2 gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById("image-upload")?.click()}
                      disabled={imageUploading}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title="上传图片"
                    >
                      {imageUploading ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15l-5-5L5 21" />
                        </svg>
                      )}
                    </button>
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

              {/* Image Gallery */}
              {images.length > 0 && (
                <div className="mb-6">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        className="flex-shrink-0 cursor-pointer group relative"
                        onClick={() => setPreviewIndex(idx)}
                      >
                        <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group-hover:border-blue-400 transition-colors">
                          <img
                            src={`/api/images/${img.id}`}
                            alt={img.original_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {img.display_name}
                        </span>
                      </div>
                    ))}
                  </div>
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
          )}

          {/* Uploads Tab */}
          {activeTab === "uploads" && (
            <UploadSection
              sessionId={sessionId}
              user={user}
              uploads={uploads}
              onUploadsChange={setUploads}
              onLoginRedirect={() => router.push("/login")}
            />
          )}
        </div>
      </main>

      {/* Image Preview Modal */}
      {previewIndex !== null && images[previewIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewIndex(null)}
        >
          <div className="relative" style={{ width: "90vw", height: "90vh" }}>
            <button
              onClick={() => setPreviewIndex(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl transition-colors"
            >
              &times;
            </button>
            {/* Left arrow */}
            {previewIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setPreviewIndex(previewIndex - 1); }}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white text-xl transition-colors"
              >
                &#8249;
              </button>
            )}
            {/* Right arrow */}
            {previewIndex < images.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setPreviewIndex(previewIndex + 1); }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white text-xl transition-colors"
              >
                &#8250;
              </button>
            )}
            <img
              src={`/api/images/${images[previewIndex].id}`}
              alt="preview"
              className="max-w-full max-h-full object-contain mx-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
