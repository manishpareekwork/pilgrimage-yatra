import { PageHeader, FormSection, Field, Select, TextInput } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { ExportButton } from "./ExportButton";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireStaff();
  const params = (await searchParams) ?? {};
  const modeParam = Array.isArray(params.mode) ? params.mode?.[0] : params.mode;
  const trainNo = Array.isArray(params.train_no) ? params.train_no?.[0] : params.train_no;
  const flightNo = Array.isArray(params.flight_no) ? params.flight_no?.[0] : params.flight_no;
  const coachNo = Array.isArray(params.coach_no) ? params.coach_no?.[0] : params.coach_no;
  const classCode = Array.isArray(params.class_code) ? params.class_code?.[0] : params.class_code;

  const { data: cityCounts } = await supabase.rpc("fn_report_city_counts");
  const { data: districtCounts } = await supabase.rpc("fn_report_district_counts");
  const { data: travelMembers } = await supabase.rpc("fn_report_travel_members", {
    p_mode: modeParam || null,
    p_train_no: trainNo || null,
    p_flight_no: flightNo || null,
    p_coach_no: coachNo || null,
    p_class_code: classCode || null,
  });
  const { data: hotelStays } = await supabase.rpc("fn_report_hotel_stays");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Operational reports with CSV exports."
      />

      <FormSection title="City & District Counts">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-4">
            <div className="text-xs uppercase text-[color:var(--muted)]">City-wise</div>
            <div className="mt-3 space-y-1">
              {(cityCounts ?? []).slice(0, 6).map((row: any) => (
                <div key={row.city} className="flex justify-between text-sm">
                  <span>{row.city}</span>
                  <span className="text-[color:var(--muted)]">{row.total}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <ExportButton
                filename="city-report.csv"
                headers={["City", "Total"]}
                rows={(cityCounts ?? []).map((row: any) => [row.city, row.total])}
              />
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase text-[color:var(--muted)]">District-wise</div>
            <div className="mt-3 space-y-1">
              {(districtCounts ?? []).slice(0, 6).map((row: any) => (
                <div key={row.district} className="flex justify-between text-sm">
                  <span>{row.district}</span>
                  <span className="text-[color:var(--muted)]">{row.total}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <ExportButton
                filename="district-report.csv"
                headers={["District", "Total"]}
                rows={(districtCounts ?? []).map((row: any) => [row.district, row.total])}
              />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Travelers by Trip/Coach/Class">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <Field label="Mode" htmlFor="mode">
            <Select id="mode" name="mode" defaultValue={modeParam ?? ""}>
              <option value="">All</option>
              <option value="train">Train</option>
              <option value="air">Air</option>
            </Select>
          </Field>
          <Field label="Train no" htmlFor="train_no">
            <TextInput id="train_no" name="train_no" defaultValue={trainNo ?? ""} />
          </Field>
          <Field label="Flight no" htmlFor="flight_no">
            <TextInput id="flight_no" name="flight_no" defaultValue={flightNo ?? ""} />
          </Field>
          <Field label="Coach no" htmlFor="coach_no">
            <TextInput id="coach_no" name="coach_no" defaultValue={coachNo ?? ""} />
          </Field>
          <Field label="Class code" htmlFor="class_code">
            <TextInput id="class_code" name="class_code" defaultValue={classCode ?? ""} />
          </Field>
          <button type="submit" className="btn-secondary">Apply filters</button>
        </form>

        <div className="mt-4">
          <ExportButton
            filename="travel-members.csv"
            headers={["Trip", "Date", "Mode", "Train", "Flight", "Group", "Coach", "Seat", "Berth", "Name", "Phone"]}
            rows={(travelMembers ?? []).map((row: any) => [
              row.trip_name,
              row.journey_date,
              row.mode,
              row.train_no,
              row.flight_no,
              row.group_code,
              row.coach_no,
              row.seat_no,
              row.berth_no,
              row.name_hi,
              row.phone,
            ])}
          />
        </div>
      </FormSection>

      <FormSection title="Hotel Stays">
        <div className="mt-2">
          <ExportButton
            filename="hotel-stays.csv"
            headers={["Hotel", "Room", "Name", "Phone", "Stay From", "Stay To"]}
            rows={(hotelStays ?? []).map((row: any) => [
              row.hotel_name,
              row.room_no,
              row.name_hi,
              row.phone,
              row.stay_from,
              row.stay_to,
            ])}
          />
        </div>
      </FormSection>
    </div>
  );
}
