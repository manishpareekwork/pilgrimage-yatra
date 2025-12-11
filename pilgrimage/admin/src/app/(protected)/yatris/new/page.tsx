import Link from "next/link";
import { getActionSupabase, getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function createRegistration(formData: FormData) {
  "use server";
  const supabase = await getActionSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/login");
  }

  const payload = {
    owner: userData.user.id,
    created_by: userData.user.id,
    name_hi: formData.get("name_hi")?.toString().trim() || null,
    father_name_hi: formData.get("father_name_hi")?.toString().trim() || null,
    address_hi: formData.get("address_hi")?.toString().trim() || null,
    phone: formData.get("phone")?.toString().trim() || null,
    whatsapp: formData.get("whatsapp")?.toString().trim() || null,
    travel_mode: formData.get("travel_mode")?.toString().trim() || null,
    train_class: formData.get("train_class")?.toString().trim() || null,
    health_bp: formData.get("health_bp") === "on",
    health_diabetes: formData.get("health_diabetes") === "on",
    emergency_contact_name: formData.get("emergency_contact_name")?.toString().trim() || null,
    emergency_contact_phone: formData.get("emergency_contact_phone")?.toString().trim() || null,
    status: "submitted",
  };

  const { data, error } = await supabase
    .from("yatra_registrations")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/yatris/${data.id}`);
}

export default async function NewYatriPage() {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-white/95 border border-orange-100/70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-600 font-semibold">
              Create
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              New Registration
            </h1>
            <p className="text-sm text-slate-600">
              Minimal fields required to save a Yatri. You can edit more details later.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6 bg-white/95">
        <form action={createRegistration} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Name (Hindi allowed)
              <input
                name="name_hi"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-slate-700">
              Father/Guardian
              <input
                name="father_name_hi"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-slate-700">
              Phone
              <input
                name="phone"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-slate-700">
              WhatsApp
              <input
                name="whatsapp"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-slate-700">
              Travel Mode
              <select
                name="travel_mode"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="train">Train</option>
                <option value="air">Air</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Train Class
              <input
                name="train_class"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="text-sm text-slate-700 block">
            Address
            <textarea
              name="address_hi"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Emergency Contact Name
              <input
                name="emergency_contact_name"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-slate-700">
              Emergency Contact Phone
              <input
                name="emergency_contact_phone"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="health_bp" className="h-4 w-4 rounded border-slate-300" />
              BP
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="health_diabetes" className="h-4 w-4 rounded border-slate-300" />
              Diabetes
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-5 py-2 text-sm font-semibold text-black shadow"
            >
              Save & Open
            </button>
            <Link href="/yatris" className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
