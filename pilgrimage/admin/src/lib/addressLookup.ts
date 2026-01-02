import type { SupabaseClient } from "@supabase/supabase-js";

export type AddressOption = {
  id: string;
  name: string;
};

export const listStates = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase.rpc("fn_list_states");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.state_id ?? row.id ?? row.name,
    name: row.state_name ?? row.name ?? row.id,
  })) as AddressOption[];
};

export const listDistricts = async (supabase: SupabaseClient, stateId: string) => {
  const { data, error } = await supabase.rpc("fn_list_districts", { p_state_id: stateId });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.district_id ?? row.id ?? row.name,
    name: row.district_name ?? row.name ?? row.id,
  })) as AddressOption[];
};
