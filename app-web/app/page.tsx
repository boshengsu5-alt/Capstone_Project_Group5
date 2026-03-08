"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth"; // 调用你刚刚填充好的 auth.ts
import { LockKeyhole, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await signIn(email, password);
      if (authError) throw authError;

      // 登录成功，跳转到仪表盘首页
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "登录失败，请检查账号密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
      <div className="w-full max-w-[400px] p-8 rounded-[2.5rem] bg-zinc-900/40 border border-white/10 backdrop-blur-2xl shadow-2xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)]">
            <LockKeyhole className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
            Letao Assets
          </h1>
          <p className="text-zinc-500 text-sm mt-2 font-medium">企业级资产管理系统</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="email" placeholder="管理邮箱" required
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 outline-none focus:ring-2 focus:ring-blue-500/50"
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="password" placeholder="准入密码" required
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 outline-none focus:ring-2 focus:ring-blue-500/50"
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "进入管理面板"}
          </button>
        </form>
      </div>
    </div>
  );
}
