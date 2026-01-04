import type { SupabaseClient } from "@supabase/supabase-js";

export const createTrip = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_create_trip", payload);

export const createCoTravelGroup = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_create_co_travel_group", payload);

export const updateCoTravelGroup = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_update_co_travel_group", payload);

export const upsertCoTravelMember = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_upsert_co_travel_group_member", payload);

export const setGroupIncharge = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_set_group_incharge", payload);

export const setTrainCoachIncharge = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_set_train_coach_incharge", payload);

export const createHotel = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_create_hotel", payload);

export const createHotelRoom = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_create_hotel_room", payload);

export const assignRoomStay = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_assign_room_stay", payload);

export const setRoomIncharge = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_set_room_incharge", payload);

export const setHotelIncharge = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_set_hotel_incharge", payload);

export const createBookingTask = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_create_booking_task", payload);

export const fetchCityCounts = (supabase: SupabaseClient) =>
  supabase.rpc("fn_report_city_counts");

export const fetchDistrictCounts = (supabase: SupabaseClient) =>
  supabase.rpc("fn_report_district_counts");

export const fetchTravelMembers = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_report_travel_members", payload);

export const fetchHotelStays = (supabase: SupabaseClient) =>
  supabase.rpc("fn_report_hotel_stays");

export const fetchIdCardData = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("fn_id_card_data", payload);

export const adminUpsertTrainStops = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("admin_upsert_train_stops", payload);

export const adminCreateTripFromMaster = (supabase: SupabaseClient, payload: Record<string, unknown>) =>
  supabase.rpc("admin_create_trip_from_master", payload);
