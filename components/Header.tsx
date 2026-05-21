"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
}

interface HeaderProps {
  user: UserInfo | null;
  currentPath: string;
  onLogout: () => void;
}

export default function Header({ user, currentPath, onLogout }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleExport = async (type: "schedules" | "reflections") => {
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/export/${type}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qecon-${type}-${user!.username}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Export failed");
    }
  };

  const handleImport = (type: "schedules" | "reflections") => {
    setMenuOpen(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const json = JSON.parse(text);
        const res = await fetch(`/api/import/${type}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(json),
        });
        const result = await res.json();
        if (res.ok) {
          alert(`导入完成：成功 ${result.imported} 条，跳过 ${result.skipped} 条，无效 ${result.invalid} 条`);
        } else {
          alert(`导入失败：${result.error}`);
        }
      } catch {
        alert("文件格式错误");
      }
    };
    input.click();
  };

  const navItems = [
    { path: "/", label: "活动日程" },
    { path: "/my-schedule", label: "我的日程", requireAuth: true },
  ];

  return (
    <header className="gradient-header shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1
              className="text-xl font-bold text-white cursor-pointer"
              onClick={() => router.push("/")}
            >
              QECON 活动日程
            </h1>
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => {
                if (item.requireAuth && !user) return null;
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-all"
                >
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {user.display_name.charAt(0)}
                  </span>
                  <span className="hidden sm:inline">{user.display_name}</span>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1 animate-fade-in">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.display_name}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                      <button
                        onClick={() => handleExport("schedules")}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        导出日程
                      </button>
                      <button
                        onClick={() => handleExport("reflections")}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        导出感想
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => handleImport("schedules")}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        导入日程
                      </button>
                      <button
                        onClick={() => handleImport("reflections")}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        导入感想
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-all"
                >
                  登录
                </button>
                <button
                  onClick={() => router.push("/register")}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-all"
                >
                  注册
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="sm:hidden flex items-center gap-1 pb-3 -mt-1">
          {navItems.map((item) => {
            if (item.requireAuth && !user) return null;
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
