import { createServerActionClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Next 16 returns a Promise from cookies(); unwrap it before passing to Supabase helpers.
const getCookieAdapter = async () => {
  const store = await cookies();
  return {
    get: (name: string) => store.get(name),
    getAll: () => store.getAll(),
    set: (name: string, value: string, options?: any) => store.set(name, value, options as any),
    delete: (name: string) => store.delete(name),
  };
};

export const getServerSupabase = async () => {
  const cookieAdapter = await getCookieAdapter();
  return createServerComponentClient(
    {
      cookies: async () => cookieAdapter,
    } as any
  );
};

export const getActionSupabase = async () => {
  const cookieAdapter = await getCookieAdapter();
  return createServerActionClient(
    {
      cookies: async () => cookieAdapter,
    } as any
  );
};
