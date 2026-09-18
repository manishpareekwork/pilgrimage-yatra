import { redirect } from "next/navigation";

/** Legacy route — trip management lives under Masters → Trips. */
export default function TripsPageRedirect() {
  redirect("/masters/trips");
}
