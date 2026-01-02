"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormSection, PageHeader, Select, TextInput } from "@/components/ui";

const roles = ["admin", "reviewer", "volunteer", "yatri"] as const;

type MessageState = { type: "error" | "success"; text: string } | null;

export function CreateUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("reviewer");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

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
        setMessage({ type: "error", text: data.error || "Failed to create user" });
      } else {
        setMessage({ type: "success", text: `Created user ${data.email} (${data.role})` });
        setEmail("");
        setPassword("");
        router.refresh();
      }
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Admin-only view of Supabase profiles (email managed in Supabase Auth)."
        actions={
          <div className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
            Admin role required
          </div>
        }
      />

      <FormSection title="Create user" description="Provision a new admin, reviewer, or volunteer.">
        {message && (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              message.type === "error"
                ? "border-red-500/40 bg-red-950/40 text-red-200"
                : "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
            }`}
          >
            {message.text}
          </div>
        )}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Email" htmlFor="email" required>
              <TextInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password" htmlFor="password" required>
              <TextInput
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <Field label="Role" htmlFor="role" required>
              <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-4 py-2 text-sm font-semibold text-black shadow disabled:opacity-60"
            >
              {busy ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
