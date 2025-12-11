"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const roles = ["admin", "reviewer", "volunteer", "yatri"] as const;

export function CreateUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("reviewer");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to create user");
      } else {
        setMessage(`Created user ${data.email} (${data.role})`);
        setEmail("");
        setPassword("");
        router.refresh();
      }
    } catch (err) {
      setMessage(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="text-sm font-semibold text-slate-700 mb-3">
        Create Supabase User
      </div>
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <div className="text-slate-600 mb-1">Email</div>
            <input
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            <div className="text-slate-600 mb-1">Password</div>
            <input
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            <div className="text-slate-600 mb-1">Role</div>
            <select
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-3 items-center">
          <button
            type="submit"
            disabled={busy}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-60"
          >
            {busy ? "Creating..." : "Create user"}
          </button>
          {message && <div className="text-sm text-slate-700">{message}</div>}
        </div>
      </form>
    </div>
  );
}
