"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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

interface UploadSectionProps {
  sessionId: string;
  user: UserInfo | null;
  uploads: UploadInfo[];
  onUploadsChange: (uploads: UploadInfo[]) => void;
  onLoginRedirect: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function UploadSection({ sessionId, user, uploads, onUploadsChange, onLoginRedirect }: UploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewUpload, setPreviewUpload] = useState<UploadInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (previewUpload) {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setPreviewUpload(null);
      };
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [previewUpload]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("仅支持PDF文件");
      e.target.value = "";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert("文件大小不能超过20MB");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("file", file);

      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      if (res.ok) {
        const detailRes = await fetch(`/api/sessions/${sessionId}`);
        const detailData = await detailRes.json();
        if (detailRes.ok) {
          onUploadsChange(detailData.uploads);
        }
      } else {
        const data = await res.json();
        alert(data.error || "上传失败");
      }
    } catch {
      alert("上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (uploadId: number) => {
    if (!confirm("确定要删除此文件吗？")) return;

    setDeletingId(uploadId);
    try {
      const res = await fetch(`/api/uploads/${uploadId}`, { method: "DELETE" });
      if (res.ok) {
        onUploadsChange(uploads.filter((u) => u.id !== uploadId));
      } else {
        const data = await res.json();
        alert(data.error || "删除失败");
      }
    } catch {
      alert("删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  const grouped: { userId: number; name: string; initial: string; items: UploadInfo[] }[] = [];
  for (const u of uploads) {
    const g = grouped.find((g) => g.userId === u.user_id);
    if (g) {
      g.items.push(u);
    } else {
      grouped.push({ userId: u.user_id, name: u.display_name, initial: u.display_name.charAt(0), items: [u] });
    }
  }

  return (
    <>
      {/* Upload Section */}
      <div>
        {user && (
          <div className="mb-5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                uploading
                  ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {uploading ? "上传中..." : "上传PDF文件"}
            </label>
          </div>
        )}

        {!user && (
          <div className="mb-5 p-4 rounded-lg bg-gray-50 text-center">
            <p className="text-sm text-gray-500">
              <button
                onClick={onLoginRedirect}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                登录
              </button>
              后可以上传文件
            </p>
          </div>
        )}

        {uploads.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm">暂无共享文件</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.userId} className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-600">
                    {g.initial}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{g.name}</span>
                </div>
                <div className="space-y-2 pl-8">
                  {g.items.map((u) => (
                    <div key={u.id} className="border-l-2 border-green-100 pl-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                            <path d="M8 12h3v1.5H9.5V14H11v1.5H8V12zm4 0h1.5c.83 0 1.5.67 1.5 1.5v.5c0 .83-.67 1.5-1.5 1.5H12V12zm1.5 2h.5v-.5h-.5V14zM8 16h8v1.5H8V16z"/>
                          </svg>
                          <button
                            onClick={() => setPreviewUpload(u)}
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate text-left"
                          >
                            {u.original_name}
                          </button>
                          <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(u.file_size)}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">
                            {new Date(u.created_at + "Z").toLocaleString("zh-CN")}
                          </span>
                          {user && user.id === u.user_id && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              disabled={deletingId === u.id}
                              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                              title="删除文件"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {previewUpload && createPortal(
        <div className="fixed inset-0 z-[60]">
          <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={() => setPreviewUpload(null)} />
          <div className="fixed inset-0 bg-white animate-fade-in flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
              <span className="text-sm font-medium text-gray-700 truncate">{previewUpload.original_name}</span>
              <button
                onClick={() => setPreviewUpload(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <iframe
              src={`/api/uploads/${previewUpload.id}`}
              className="flex-1 w-full border-0"
              title={previewUpload.original_name}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
