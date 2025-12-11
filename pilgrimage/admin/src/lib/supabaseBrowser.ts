import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const getBrowserSupabase = () => createClientComponentClient();
