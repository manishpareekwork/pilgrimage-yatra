import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import banner from "@/assets/images/common/banner-hdr.png";

const statusLabels = [
  { key: "submitted", label: "Submitted", color: "bg-amber-100 text-amber-800" },
  { key: "needs_review", label: "Needs Review", color: "bg-indigo-100 text-indigo-800" },
  { key: "approved", label: "Approved", color: "bg-emerald-100 text-emerald-800" },
  { key: "rejected", label: "Rejected", color: "bg-rose-100 text-rose-800" },
] as const;

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const totals = await Promise.all(
    statusLabels.map(async ({ key, label }) => {
      const { count } = await supabase
        .from("yatra_registrations")
        .select("id", { count: "exact", head: true })
        .eq("status", key);
      return { label, key, count: count ?? 0 };
    })
  );

  const { count: allCount } = await supabase
    .from("yatra_registrations")
    .select("id", { count: "exact", head: true });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px", color: "#0f172a" }}>
      <div
        style={{
          position: "relative",
          borderRadius: 28,
          overflow: "hidden",
          minHeight: 240,
          boxShadow: "0 20px 50px rgba(15,23,42,0.35)",
          border: "1px solid rgba(255,255,255,0.08)",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(135deg, rgba(11,18,33,0.82), rgba(11,18,33,0.65)), url(${banner.src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1), transparent 35%)",
          }}
        />
        <div
          style={{
            position: "relative",
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.78)",
                fontWeight: 600,
              }}
            >
              Yatra Control
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>Dashboard</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", maxWidth: 640 }}>
              Live snapshot of registrations for Jagannath Puri 2025 with RLS protection and review
              workflow.
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  height: 8,
                  width: 8,
                  borderRadius: 999,
                  background: "#bbf7d0",
                  display: "inline-block",
                }}
              />
              Supabase connected · Service health good
            </div>
          </div>
          <div
            style={{
              alignSelf: "flex-start",
              background: "rgba(255,255,255,0.9)",
              color: "#0f172a",
              borderRadius: 16,
              padding: "14px 16px",
              minWidth: 220,
              boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", color: "#ea580c", fontWeight: 700 }}>
              Total registrations
            </div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{allCount ?? 0}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>All statuses</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        {totals.map(({ key, label, count }) => (
          <div
            key={key}
            style={{
              borderRadius: 16,
              background: "#fff",
              padding: 18,
              boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
              border: "1px solid rgba(226,232,240,0.8)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#475569",
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  height: 36,
                  width: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  background: "#f8fafc",
                  fontSize: 18,
                }}
              >
                {key === "submitted" && "📝"}
                {key === "needs_review" && "🔍"}
                {key === "approved" && "✅"}
                {key === "rejected" && "⛔"}
              </span>
              {label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#0f172a", marginTop: 8 }}>
              {count}
            </div>
            <div
              style={{
                marginTop: 10,
                height: 6,
                borderRadius: 999,
                background: "#e2e8f0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, count && allCount ? (count / (allCount || 1)) * 100 : 0).toFixed(0)}%`,
                  background: "linear-gradient(90deg, #f97316, #0ea5e9)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
