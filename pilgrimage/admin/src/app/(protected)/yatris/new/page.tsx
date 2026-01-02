import { createRegistrationAction } from "./actions";
import { NewRegistrationForm } from "./NewRegistrationForm";
import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewYatriPage() {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  return <NewRegistrationForm action={createRegistrationAction} />;
}
