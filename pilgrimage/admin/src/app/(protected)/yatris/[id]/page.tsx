import {
  approveRegistration,
  rejectRegistration,
  updateRegistrationAction,
} from "./actions";
import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function YatriDetail({
  params,
}: {
  params: { id: string };
}) {

  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const { data: registration, error } = await supabase
    .from("yatra_registrations")
    .select(
      "id,name_hi,father_name_hi,address_hi,phone,whatsapp,travel_mode,train_class,health_bp,health_diabetes,health_other,emergency_contact_name,emergency_contact_phone,photo_url,form_image_url,status,ocr_confidence,created_at,raw_json"
    )
    .eq("id", params.id)
    .single();

  if (error || !registration) {
    return (
      <div className="space-y-3">
        <Link href="/yatris" className="text-orange-700 hover:text-orange-900">
          ← Back to Yatris
        </Link>
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Unable to load registration.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
          <div className="card p-5 flex items-center justify-between bg-white/95 border border-orange-100/70">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-orange-600 font-semibold">
            Registration
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {registration.name_hi}
          </h1>
          <p className="text-sm text-slate-600">Detail & quick edit</p>
        </div>
        <Link href="/yatris" className="text-orange-700 hover:text-orange-900 font-semibold">
          Back to list
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5 bg-white/95">
            <div className="text-sm font-semibold text-slate-700 mb-3">
              Registration Snapshot
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">
                  {registration.phone || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">WhatsApp</dt>
                <dd className="font-medium text-slate-900">
                  {registration.whatsapp || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Travel Mode</dt>
                <dd className="font-medium text-slate-900">
                  {registration.travel_mode || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Train Class</dt>
                <dd className="font-medium text-slate-900">
                  {registration.train_class || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Health Flags</dt>
                <dd className="font-medium text-slate-900 space-x-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      registration.health_bp
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    BP
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      registration.health_diabetes
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Diabetes
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Emergency Contact</dt>
                <dd className="font-medium text-slate-900">
                  {registration.emergency_contact_name || "—"}{" "}
                  {registration.emergency_contact_phone && (
                    <span className="text-slate-600">
                      ({registration.emergency_contact_phone})
                    </span>
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Address</dt>
                <dd className="font-medium text-slate-900">
                  {registration.address_hi || "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Other health notes</dt>
                <dd className="font-medium text-slate-900">
                  {registration.health_other || "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-semibold uppercase tracking-wide text-indigo-800">
                  {registration.status}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-5 bg-white/95">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">
                Quick Edit
              </div>
              <div className="text-xs text-slate-500">
                Updates run through Supabase RLS.
              </div>
            </div>
            <form action={updateRegistrationAction} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={registration.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <div className="text-slate-600 mb-1">Name (Hindi OK)</div>
                  <input
                    name="name_hi"
                    defaultValue={registration.name_hi ?? ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <div className="text-slate-600 mb-1">Father/Guardian</div>
                  <input
                    name="father_name_hi"
                    defaultValue={registration.father_name_hi ?? ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <div className="text-slate-600 mb-1">Phone</div>
                  <input
                    name="phone"
                    defaultValue={registration.phone ?? ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <div className="text-slate-600 mb-1">WhatsApp</div>
                  <input
                    name="whatsapp"
                    defaultValue={registration.whatsapp ?? ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <div className="text-slate-600 mb-1">Travel Mode</div>
                  <select
                    name="travel_mode"
                    defaultValue={registration.travel_mode ?? ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="train">Train</option>
                    <option value="air">Air</option>
                  </select>
                </label>
                <label className="text-sm">
                  <div className="text-slate-600 mb-1">Train Class</div>
                  <input
                    name="train_class"
                    defaultValue={registration.train_class ?? ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="text-sm block">
                <div className="text-slate-600 mb-1">Address</div>
                <textarea
                  name="address_hi"
                  defaultValue={registration.address_hi ?? ""}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  rows={3}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <div className="text-slate-600 mb-1">Emergency Contact</div>
                  <input
                    name="emergency_contact_name"
                    defaultValue={registration.emergency_contact_name ?? ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <div className="text-slate-600 mb-1">
                    Emergency Contact Phone
                  </div>
                  <input
                    name="emergency_contact_phone"
                    defaultValue={registration.emergency_contact_phone ?? ""}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="text-sm block">
                <div className="text-slate-600 mb-1">Other Health Notes</div>
                <textarea
                  name="health_other"
                  defaultValue={registration.health_other ?? ""}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  rows={2}
                />
              </label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="health_bp"
                    defaultChecked={registration.health_bp}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  BP
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="health_diabetes"
                    defaultChecked={registration.health_diabetes}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Diabetes
                </label>
                <label className="text-sm">
                  <select
                    name="status"
                    defaultValue={registration.status}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-primary text-sm px-4 py-2"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">
              Review Actions
            </div>
            <div className="flex gap-3">
              <form action={approveRegistration}>
                <input type="hidden" name="id" value={registration.id} />
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm"
                >
                  Approve
                </button>
              </form>
              <form action={rejectRegistration}>
                <input type="hidden" name="id" value={registration.id} />
                <button
                  type="submit"
                  className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 shadow-sm"
                >
                  Reject
                </button>
              </form>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Actions call `fn_create_review` and update status.
            </div>
          </div>

          <div className="card p-4">
            <div className="text-sm font-semibold text-slate-700 mb-2">
              Form Image
            </div>
            {registration.form_image_url ? (
              <img
                src={registration.form_image_url}
                alt="Form image"
                className="w-full rounded-md border border-slate-100"
              />
            ) : (
              <div className="text-sm text-slate-500">No form image yet.</div>
            )}
          </div>

          <div className="card p-4">
            <div className="text-sm font-semibold text-slate-700 mb-2">
              Photo
            </div>
            {registration.photo_url ? (
              <img
                src={registration.photo_url}
                alt="Yatri photo"
                className="w-full rounded-md border border-slate-100"
              />
            ) : (
              <div className="text-sm text-slate-500">No photo uploaded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
