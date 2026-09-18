-- Distinct import sheets with CM257 eligibility counts (for admin bucket pickers).
create or replace view public.yatra_import_sheet_stats as
select
  source_sheet as name,
  count(*)::int as total,
  count(*) filter (
    where travel_mode = 'train' and reservation_by = 'committee'
  )::int as cm257_ready
from public.yatra_registrations
where source_sheet is not null and btrim(source_sheet) <> ''
group by source_sheet;

grant select on public.yatra_import_sheet_stats to authenticated, service_role;
