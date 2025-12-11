import { createServerActionClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Next 16 returns a Promise from cookies(); unwrap it before passing to Supabase helpers.
const getCookieAdapter = async () => {
  const store = await cookies();
  return {
    get: (name: string) => store.get(name),
    getAll: () => store.getAll(),
    set: (name: string, value: string, options?: Parameters<typeof store.set>[2]) =>
      store.set(name, value, options),
    delete: (name: string, options?: Parameters<typeof store.delete>[1]) => store.delete(name, options),
  };
};

export const getServerSupabase = async () => {
  const cookieAdapter = await getCookieAdapter();
  return createServerComponentClient({
    cookies: () => cookieAdapter,
  });
};

export const getActionSupabase = async () => {
  const cookieAdapter = await getCookieAdapter();
  return createServerActionClient({
    cookies: () => cookieAdapter,
  });
};
