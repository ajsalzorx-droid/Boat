"use client";

import { useState } from "react";
import { login } from "./actions";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { cdn } from "@/lib/cdn";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(email, password);

    if (!res.ok) {
      setError(res.error);
      setLoading(false);
    } else {
      // Only follow same-site paths so ?next= can't redirect off the site
      const next = new URLSearchParams(window.location.search).get("next");
      // Follow ?next= only inside this account's own area (admin: /admin, /kitchen; SEO: /seo)
      const allowed = res.role === "seo" ? /^\/seo(\/|$)/ : /^\/(admin|kitchen)(\/|$)/;
      const target = next && /^\/(?![/\\])/.test(next) && allowed.test(next) ? next : res.home;
      router.push(target);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-navy text-white flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 z-0">
        <img 
          src={cdn("/images/custom/hero_waterfront_dubai_1777327086914.webp")} 
          className="w-full h-full object-cover opacity-20"
          alt="Background"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-navy/40"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-playfair text-4xl font-bold mb-2">Boat Seafood</h1>
          <p className="text-ocean text-[10px] tracking-[4px] uppercase font-bold">Admin Portal</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6">Sign In</h2>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase text-white/60 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  <Mail size={18} />
                </div>
                <input 
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-ocean focus:ring-1 focus:ring-ocean transition-all"
                  placeholder="admin@boatseafood.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] tracking-[2px] uppercase text-white/60 mb-2">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  <Lock size={18} />
                </div>
                <input 
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-ocean focus:ring-1 focus:ring-ocean transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-ocean hover:bg-white text-navy font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
