import { createServerActionClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Next 15: await cookies() before passing to Supabase helpers.
export const getServerSupabase = async () => {
  const store = await cookies();
  return createServerComponentClient({
    cookies: () => store,
  } as any);
};

export const getActionSupabase = async () => {
  const store = await cookies();
  return createServerActionClient({
    cookies: () => store,
  } as any);
};
