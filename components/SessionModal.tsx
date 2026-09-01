"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import UploadSection from "./UploadSection";
import SessionInfo from "./SessionInfo";
import VoiceInputButton from "./VoiceInputButton";

interface SessionExt {
  topic: string;
  speaker: string;
  time: string;
  speaker_title?: string;
  venue?: string;
  track?: string;
  producer?: string;
  stages?: string[];
  stage_summary?: string;
  detail?: { background?: string; outline?: string; gains?: string } | null;
  track_url?: string;
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

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
}

interface SessionModalProps {
  sessionId: string;
  user: UserInfo | null;
  onClose: () => void;
  onSignupChange: (sessionId: string, signedUp: boolean) => void;
}

export default function SessionModal({ sessionId, user, onClose, onSignupChange }: SessionModalProps) {
  const router = useRouter();
  const [time, setTime] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [topic, setTopic] = useState("");
  const [ext, setExt] = useState<SessionExt | null>(null);
  const [signups, setSignups] = useState<SignupInfo[]>([]);
  const [comments, setComments] = useState<CommentInfo[]>([]);
  const [uploads, setUploads] = useState<UploadInfo[]>([]);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signupLoading, setSignupLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [asrActive, setAsrActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "uploads">("comments");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (res.ok) {
        setTime(data.session.time);
        setSpeaker(data.session.speaker);
        setTopic(data.session.topic);
        setExt(data.session);
        setSignups(data.signups);
        setComments(data.comments);
        setUploads(data.uploads || []);
        setIsSignedUp(data.isSignedUp);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSignup = async () => {
    if (!user) {
      onClose();
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
        const newSignedUp = data.signedUp;
        setIsSignedUp(newSignedUp);
        onSignupChange(sessionId, newSignedUp);
        if (newSignedUp) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{topic}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="time-badge">{time}</span>
              <span>|</span>
              <span className="font-medium text-gray-700">{speaker}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* 议题扩展信息：阶段/摘要/详情 */}
              {ext && <SessionInfo session={ext} />}

              {/* Signup section */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">已报名 {signups.length} 人</span>
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

              {/* Tab Nav */}
              <div className="-mx-6 border-t border-gray-100 px-6 pt-4">
                <div className="flex gap-1 mb-4">
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
                      <form onSubmit={handleComment} className="mb-5">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 input-field text-sm resize-none"
                          rows={3}
                          placeholder="分享你参加这场活动的感想..."
                          required
                        />
                        <div className="flex items-center justify-between mt-2">
                          <VoiceInputButton
                            disabled={!!commentText.trim()}
                            onTranscript={(text) => setCommentText(text)}
                            onStatusChange={setAsrActive}
                          />
                          <button
                            type="submit"
                            disabled={commentLoading || asrActive || !commentText.trim()}
                            className="btn-primary text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                          >
                            {commentLoading ? "提交中..." : "发表感想"}
                          </button>
                        </div>
                      </form>
                    )}

                    {!user && (
                      <div className="mb-5 p-4 rounded-lg bg-gray-50 text-center">
                        <p className="text-sm text-gray-500">
                          <button
                            onClick={() => { onClose(); router.push("/login"); }}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            登录
                          </button>
                          后可以发表感想
                        </p>
                      </div>
                    )}

                    {comments.length === 0 ? (
                      <div className="text-center py-6">
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
                    onLoginRedirect={() => { onClose(); router.push("/login"); }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
