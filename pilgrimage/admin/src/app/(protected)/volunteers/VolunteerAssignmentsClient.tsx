"use client";

import { useEffect, useMemo, useState } from "react";
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

type RawMember = Omit<Member, "registration"> & {
  registration?: { name_hi: string | null; phone: string | null }[] | { name_hi: string | null; phone: string | null } | null;
};

type RegistrationRow = {
  id: string;
  name_hi: string | null;
  phone: string | null;
  aadhaar_no: string | null;
  owner: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  name_hi: string | null;
  phone: string | null;
  role: string | null;
};

type Candidate = {
  key: string;
  kind: "yatri" | "user";
  id: string;
  registrationId: string | null;
  name: string;
  phone: string | null;
  label: string;
  search: string;
};

const roleThemes = [
  {
    accent: "#38bdf8",
    background: "radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 60%)",
  },
  {
    accent: "#f59e0b",
    background: "radial-gradient(circle at top right, rgba(245, 158, 11, 0.18), transparent 60%)",
  },
  {
    accent: "#22c55e",
    background: "radial-gradient(circle at top right, rgba(34, 197, 94, 0.18), transparent 60%)",
  },
  {
    accent: "#a855f7",
    background: "radial-gradient(circle at top right, rgba(168, 85, 247, 0.18), transparent 60%)",
  },
  {
    accent: "#0ea5e9",
    background: "radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 60%)",
  },
  {
    accent: "#f97316",
    background: "radial-gradient(circle at top right, rgba(249, 115, 22, 0.18), transparent 60%)",
  },
];

const formatName = (value?: string | null) => value?.trim() || "Unnamed";

const formatPhone = (value?: string | null) => (value?.trim() ? value.trim() : "—");

function CandidateAutocomplete({
  candidates,
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  candidates: Candidate[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (candidate: Candidate) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = value.trim().toLowerCase();
    if (!term) return candidates.slice(0, 8);
    return candidates.filter((candidate) => candidate.search.includes(term)).slice(0, 8);
  }, [candidates, value]);

  return (
    <div className="relative">
      <TextInput
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
        }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-lg">
          {filtered.map((candidate) => (
            <button
              key={candidate.key}
              type="button"
              className="flex w-full flex-col gap-1 border-b border-[color:var(--border)]/60 px-3 py-2 text-left text-xs hover:bg-[color:var(--surface-muted)]"
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(candidate);
                setOpen(false);
              }}
            >
              <span className="text-sm font-semibold text-[color:var(--ink)]">
                {candidate.name}
              </span>
              <span className="text-[color:var(--muted)]">{candidate.label}</span>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-40 mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--muted)] shadow-lg">
          No matches found.
        </div>
      )}
    </div>
  );
}

function RoleMemberForm({
  roleId,
  candidates,
  onAddMember,
}: {
  roleId: string;
  candidates: Candidate[];
  onAddMember: (roleId: string, candidate: Candidate, makeLead: boolean) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [makeLead, setMakeLead] = useState(false);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!selected) return;
        void onAddMember(roleId, selected, makeLead);
        setQuery("");
        setSelected(null);
        setMakeLead(false);
      }}
    >
      <CandidateAutocomplete
        candidates={candidates}
        value={query}
        onChange={(value) => {
          setQuery(value);
          setSelected(null);
        }}
        onSelect={(candidate) => {
          setQuery(candidate.label);
          setSelected(candidate);
        }}
        placeholder="Search user or yatri name"
      />
      <label className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)]">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={makeLead}
          onChange={(event) => setMakeLead(event.target.checked)}
        />
        Group manager/lead
      </label>
      <button type="submit" className="btn-secondary master-action">
        Add member
      </button>
    </form>
  );
}

export function VolunteerAssignmentsClient() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const request = async (method: string, payload?: Record<string, unknown>) => {
    const res = await fetch("/api/admin/volunteers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error || "Unable to complete the request.");
    }
    return data;
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = (await request("GET")) as {
        roles: Role[];
        members: RawMember[];
        registrations: RegistrationRow[];
        profiles: ProfileRow[];
      };

      const normalizedMembers = (data.members ?? []).map((member) => {
        const rawMember = member as RawMember;
        const registration = Array.isArray(rawMember.registration)
          ? rawMember.registration[0] ?? null
          : rawMember.registration ?? null;
        return { ...rawMember, registration } as Member;
      });

      const registrations = (data.registrations ?? []) as RegistrationRow[];
      const profiles = (data.profiles ?? []) as ProfileRow[];

      const registrationsByOwner = new Map<string, RegistrationRow[]>();
      registrations.forEach((registration) => {
        if (!registration.owner) return;
        const list = registrationsByOwner.get(registration.owner) ?? [];
        list.push(registration);
        registrationsByOwner.set(registration.owner, list);
      });

      registrationsByOwner.forEach((list) => {
        list.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      });

      const candidateList: Candidate[] = [
        ...registrations.map<Candidate>((registration) => {
          const name = formatName(registration.name_hi);
          const phone = formatPhone(registration.phone);
          const aadhaar = registration.aadhaar_no?.trim() || "";
          const label = `${name} · ${phone} · ${registration.id} · Yatri`;
          return {
            key: `yatri-${registration.id}`,
            kind: "yatri" as const,
            id: registration.id,
            registrationId: registration.id,
            name,
            phone: registration.phone,
            label,
            search: `${name} ${phone} ${registration.id} ${aadhaar}`.toLowerCase(),
          };
        }),
        ...profiles.map<Candidate>((profile) => {
          const linkedRegistration = registrationsByOwner.get(profile.id)?.[0] ?? null;
          const name = formatName(profile.name_hi);
          const phone = formatPhone(profile.phone);
          const aadhaar = linkedRegistration?.aadhaar_no?.trim() || "";
          const regId = linkedRegistration?.id ?? "";
          const labelSuffix = linkedRegistration ? "User" : "User · no registration";
          const label = `${name} · ${phone} · ${regId || "—"} · ${labelSuffix}`;
          return {
            key: `user-${profile.id}`,
            kind: "user" as const,
            id: profile.id,
            registrationId: linkedRegistration?.id ?? null,
            name,
            phone: profile.phone,
            label,
            search: `${name} ${phone} ${profile.id} ${regId} ${aadhaar}`.toLowerCase(),
          };
        }),
      ];

      setMessage(null);
      setRoles((data.roles ?? []) as Role[]);
      setMembers(normalizedMembers);
      setCandidates(candidateList);
    } catch (err: any) {
      setMessage(err?.message || "Failed to load volunteer data.");
      setRoles([]);
      setMembers([]);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
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

  const addMember = async (roleId: string, candidate: Candidate, makeLead: boolean) => {
    const registrationId =
      candidate.kind === "yatri" ? candidate.registrationId : candidate.registrationId;
    if (!registrationId) {
      setMessage("Selected user does not have a linked yatri registration.");
      return;
    }

    try {
      await request("POST", { roleId, registrationId, makeLead });
      setMessage(null);
      await loadAll();
    } catch (err: any) {
      setMessage(err?.message || "Unable to add member.");
    }
  };

  const setHead = async (roleId: string, memberId: string) => {
    try {
      await request("PATCH", { roleId, memberId });
      setMessage(null);
      await loadAll();
    } catch (err: any) {
      setMessage(err?.message || "Unable to update group manager/lead.");
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await request("DELETE", { memberId });
      setMessage(null);
      await loadAll();
    } catch (err: any) {
      setMessage(err?.message || "Unable to remove member.");
    }
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
      {message && (
        <div className="card px-4 py-3 text-sm text-rose-200 border border-rose-500/40 bg-rose-950/30">
          {message}
        </div>
      )}

      {roles.length === 0 && (
        <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
          No volunteer roles found.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((role, index) => {
          const theme = roleThemes[index % roleThemes.length];
          const roleMembers = membersByRole[role.id] ?? [];
          const headMember = roleMembers.find((member) => member.is_head);
          return (
            <div
              key={role.id}
              className="card card--hover space-y-4 relative overflow-hidden"
              style={{ backgroundImage: theme.background, padding: "12px" }}
            >
              <div
                className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-20"
                style={{ backgroundColor: theme.accent }}
                aria-hidden="true"
              />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--ink)]">
                    {role.name_hi || role.name_en || role.code}
                  </div>
                  <div className="text-xs text-[color:var(--muted)] uppercase tracking-[0.2em]">
                    {role.code}
                  </div>
                </div>
                <div className="text-xs text-[color:var(--muted)]">
                  Members {roleMembers.length}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                <span>Group manager/lead</span>
                <span>{headMember?.registration?.name_hi || "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={`#role-view-${role.id}`}
                  className="btn-secondary master-action w-full inline-flex justify-center"
                >
                  View
                </a>
                <a
                  href={`#role-edit-${role.id}`}
                  className="btn-secondary master-action w-full inline-flex justify-center"
                >
                  Edit
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {roles.map((role) => {
        const roleMembers = membersByRole[role.id] ?? [];
        return (
          <div key={`role-view-${role.id}`} id={`role-view-${role.id}`} className="master-modal">
            <a href="#volunteers" className="master-modal__overlay" aria-label="Close" />
            <div className="master-modal__content card p-3" style={{ padding: "12px" }}>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Role members
              </div>
              <div className="mt-3 text-sm text-[color:var(--ink)] font-semibold">
                {role.name_hi || role.name_en || role.code}
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--border)]/70">
                <table className="min-w-full text-[11px] text-center">
                  <thead className="bg-[color:var(--surface-muted)] text-[10px] font-semibold uppercase text-[color:var(--muted)]">
                    <tr>
                      <th className="px-3 py-2">Member</th>
                      <th className="px-3 py-2 border-l border-[color:var(--border)]/60">Phone</th>
                      <th className="px-3 py-2 border-l border-[color:var(--border)]/60">
                        Group manager/lead
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {roleMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-3 py-2">
                          {member.registration?.name_hi || member.registration_id}
                        </td>
                        <td className="px-3 py-2 border-l border-[color:var(--border)]/60">
                          {member.registration?.phone || "—"}
                        </td>
                        <td className="px-3 py-2 border-l border-[color:var(--border)]/60">
                          {member.is_head ? "Yes" : "—"}
                        </td>
                      </tr>
                    ))}
                    {roleMembers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-center text-[color:var(--muted)]">
                          No members assigned yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <a href="#volunteers" className="btn-secondary master-action w-full mt-3">
                Close
              </a>
            </div>
          </div>
        );
      })}

      {roles.map((role) => {
        const roleMembers = membersByRole[role.id] ?? [];
        return (
          <div key={`role-edit-${role.id}`} id={`role-edit-${role.id}`} className="master-modal">
            <a href="#volunteers" className="master-modal__overlay" aria-label="Close" />
            <div className="master-modal__content card p-3" style={{ padding: "12px" }}>
              <a href="#volunteers" className="master-modal__close" aria-label="Close">
                ×
              </a>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Edit role members
              </div>
              <div className="mt-2 text-sm font-semibold text-[color:var(--ink)]">
                {role.name_hi || role.name_en || role.code}
              </div>

              <div className="mt-4 space-y-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Add member
                </div>
                <RoleMemberForm
                  roleId={role.id}
                  candidates={candidates}
                  onAddMember={addMember}
                />
                <div className="text-xs text-[color:var(--muted)]">
                  Pick a user or yatri and optionally mark as group manager/lead.
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Existing members
                </div>
                {roleMembers.length === 0 && (
                  <div className="text-xs text-[color:var(--muted)]">No members assigned yet.</div>
                )}
                {roleMembers.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-lg border border-[color:var(--border)]/70 bg-[color:var(--surface-muted)]/35 p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="font-semibold text-[color:var(--ink)]">
                        {member.registration?.name_hi || member.registration_id}
                      </div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {member.registration?.phone || "—"}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--muted)]">
                      <span>
                        {member.is_head ? "Group manager/lead" : "Member"}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className={`btn-secondary master-action ${
                            member.is_head ? "text-emerald-300" : ""
                          }`}
                          onClick={() => void setHead(role.id, member.id)}
                        >
                          {member.is_head ? "Group manager/lead" : "Set manager/lead"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary master-action text-rose-300"
                          onClick={() => void removeMember(member.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
