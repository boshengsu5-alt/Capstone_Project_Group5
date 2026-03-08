"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth"; // 确保你已经创建了 lib/auth.ts
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
      // 调用我们在 lib/auth.ts 中封装的函数
      const { data, error: authError } = await signIn(email, password);
      
      if (authError) throw authError;

      // 登录成功，跳转到仪表盘主页
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "登录失败，请检查账号密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden text-white">
      {/* 氛围灯光效果 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-[420px] z-10 p-4">
        <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-white/10 backdrop-blur-2xl shadow-2xl">
          {/* Logo 与 标题 */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)]">
              <LockKeyhole className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
              Letao Assets
            </h1>
            <p className="text-zinc-500 text-sm mt-2 font-medium">企业级资产管理系统</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="email" 
                placeholder="管理员邮箱" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="password" 
                placeholder="准入密码" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在身份验证...
                </>
              ) : (
                "进入管理面板"
              )}
            </button>
          </form>

          <p className="text-center text-zinc-600 text-[10px] mt-8 uppercase tracking-widest">
            Secured by Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}
