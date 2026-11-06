-- =============================================================================
-- CIVIRESPOND — Migration 0004: Active incident markers for dashboard live map
-- =============================================================================
-- Purpose:
--   active_incident_markers(include_closed) — authenticated dashboard feed for
--   the live operations map (control center + responder dashboard). Returns
--   exact operational coordinates (authorised viewers only — the public
--   responder map never exposes incident locations).
--
--   Authz is enforced in the API layer (verified responder or privileged
--   staff). The function is security definer so the API can serve "all
--   available incidents" to verified responders even though RLS on incidents
--   is reporter / assigned / admin only.
--
--   "Available" = status not in ('RESOLVED','CANCELLED','FALSE_REPORT').
--   Closed rows are excluded unless include_closed is true.
-- =============================================================================

create or replace function public.active_incident_markers(
  include_closed boolean default false
)
returns table (
  id uuid,
  public_reference text,
  incident_category public.incident_category,
  status public.incident_status,
  priority public.priority,
  address text,
  affected_persons integer,
  verification_status text,
  created_at timestamptz,
  updated_at timestamptz,
  lat double precision,
  lng double precision
) language sql stable security definer set search_path = public as $$
  select
    i.id,
    i.public_reference,
    i.incident_category,
    i.status,
    i.priority,
    i.address,
    i.affected_persons,
    i.verification_status,
    i.created_at,
    i.updated_at,
    st_y(i.location::geometry) as lat,
    st_x(i.location::geometry) as lng
  from public.incidents i
  where i.location is not null
    and (include_closed or i.status not in ('RESOLVED', 'CANCELLED', 'FALSE_REPORT'))
  order by i.created_at desc
  limit 500;
$$;

-- API role-checks before calling; restrict execute to signed-in users.
grant execute on function public.active_incident_markers(boolean) to authenticated;
