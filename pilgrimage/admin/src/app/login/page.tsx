"use client";

import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

export default function LoginPage() {
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        backgroundImage: "linear-gradient(135deg, #0f172a, #0b2d3f)",
        color: "#e2e8f0",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              display: "inline-flex",
              height: 48,
              width: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "linear-gradient(135deg, #f97316, #0ea5e9)",
              color: "#fff",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            ॐ
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>
            Pilgrimage Admin
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1" }}>
            Sign in to manage yatri registrations
          </div>
        </div>

        <div
          style={{
            borderRadius: 16,
            padding: 18,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
          }}
        >
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label htmlFor="email" style={{ fontSize: 13, color: "#cbd5e1" }}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.12)",
                  padding: "10px 12px",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label htmlFor="password" style={{ fontSize: 13, color: "#cbd5e1" }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.12)",
                  padding: "10px 12px",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            </div>
            {error && (
              <div
                style={{
                  fontSize: 13,
                  color: "#fecdd3",
                  background: "rgba(190,24,93,0.15)",
                  border: "1px solid rgba(190,24,93,0.4)",
                  borderRadius: 10,
                  padding: "8px 10px",
                }}
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 12,
                padding: "12px",
                fontSize: 14,
                fontWeight: 700,
                color: "#0f172a",
                background: "linear-gradient(135deg, #f97316, #fb923c, #0ea5e9)",
                boxShadow: "0 12px 30px rgba(249,115,22,0.35)",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
            Seeded users: admin@admin.com / 12345678
          </div>
        </div>
      </div>
    </div>
  );
}
