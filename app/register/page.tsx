"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push("/");
      } else {
        setError(data.error || "注册失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Header user={user} currentPath="/register" onLogout={() => { setUser(null); router.push("/"); }} />

      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">注册</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 input-field text-sm"
                placeholder="2-20 个字符"
                required
                minLength={2}
                maxLength={50}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">显示名称</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 input-field text-sm"
                placeholder="大家看到的名字"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 input-field text-sm"
                placeholder="至少 4 个字符"
                required
                minLength={4}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 btn-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "注册中..." : "注册"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            已有账户？{" "}
            <button
              onClick={() => router.push("/login")}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              登录
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
