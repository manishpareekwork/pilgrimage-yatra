"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { ChakraSpinner, TextInput } from "@/components/ui";

type Role = {
  id: string;
  code: string;
  name_hi: string | null;
  name_en: string | null;
};

type Member = {
  id: string;
  role_id: string;
  registration_id: string;
  is_head: boolean;
  registration?: { name_hi: string | null; phone: string | null } | null;
};

export function VolunteerAssignmentsClient() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [rolesRes, membersRes] = await Promise.all([
      supabase.from("volunteer_roles").select("id, code, name_hi, name_en").order("code"),
      supabase
        .from("volunteer_role_members")
        .select("id, role_id, registration_id, is_head, registration:yatra_registrations(name_hi, phone)")
        .order("created_at", { ascending: true }),
    ]);
    if (rolesRes.error || membersRes.error) {
      setMessage(rolesRes.error?.message || membersRes.error?.message || "Failed to load roles");
    } else {
      setMessage(null);
      setRoles((rolesRes.data ?? []) as Role[]);
      setMembers((membersRes.data ?? []) as Member[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const membersByRole = useMemo(() => {
    const map: Record<string, Member[]> = {};
    members.forEach((member) => {
      if (!map[member.role_id]) map[member.role_id] = [];
      map[member.role_id].push(member);
    });
    return map;
  }, [members]);

  const addMember = async (roleId: string, registrationId: string) => {
    const { error } = await supabase
      .from("volunteer_role_members")
      .insert({ role_id: roleId, registration_id: registrationId, is_head: false });
    if (error) setMessage(error.message);
    else setMessage(null);
    await loadAll();
  };

  const setHead = async (roleId: string, memberId: string) => {
    const { error: resetError } = await supabase
      .from("volunteer_role_members")
      .update({ is_head: false })
      .eq("role_id", roleId);
    if (resetError) {
      setMessage(resetError.message);
      return;
    }
    const { error } = await supabase
      .from("volunteer_role_members")
      .update({ is_head: true })
      .eq("id", memberId);
    if (error) setMessage(error.message);
    else setMessage(null);
    await loadAll();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
        <ChakraSpinner />
        Loading volunteer assignments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && <div className="text-sm text-rose-300">{message}</div>}
      {roles.map((role) => {
        const roleMembers = membersByRole[role.id] ?? [];
        const headMember = roleMembers.find((member) => member.is_head);
        return (
          <div key={role.id} className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-[color:var(--ink)]">
                  {role.name_hi || role.name_en || role.code}
                </div>
                <div className="text-xs text-[color:var(--muted)]">Code: {role.code}</div>
              </div>
              <div className="text-xs text-[color:var(--muted)]">
                SPOC: {headMember?.registration?.name_hi || "—"}
              </div>
            </div>

            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const registrationId = form.get("registration_id")?.toString().trim();
                if (registrationId) void addMember(role.id, registrationId);
                event.currentTarget.reset();
              }}
            >
              <TextInput name="registration_id" placeholder="Registration ID" required />
              <button type="submit" className="btn-secondary">Add member</button>
            </form>

            <div className="overflow-hidden rounded-xl border border-slate-800/60">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-left text-xs font-semibold uppercase text-slate-300">
                  <tr>
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">SPOC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {roleMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-3 py-2 text-slate-100">
                        {member.registration?.name_hi || member.registration_id}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {member.registration?.phone || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className={`btn-secondary ${member.is_head ? "text-emerald-300" : ""}`}
                          onClick={() => void setHead(role.id, member.id)}
                        >
                          {member.is_head ? "Head" : "Make head"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {roleMembers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-center text-slate-400">
                        No members assigned yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
