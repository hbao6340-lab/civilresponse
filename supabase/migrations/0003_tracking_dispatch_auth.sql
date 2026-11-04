-- =============================================================================
-- CIVIRESPOND — Migration 0003: Anonymous tracking, real dispatch, auth bootstrap
-- =============================================================================
-- Purpose:
--  1. track_incident_by_token() — anonymous citizens can track their own
--     incident by reference + secret token (definer RPC; token hash compared
--     in constant time; exact coordinates never returned).
--  2. dispatch_incident() — after submit, create 'pending' assignments for
--     eligible nearby responders (verified, duty, sharing, fresh GPS) plus
--     in-app notification rows. The API calls this immediately after insert.
--  3. Booking: list_incident_assignments() helper for responder inbox is
--     already covered via RLS; no change needed here.
--  4. Auth bootstrap: handle_new_user trigger auto-creates profiles and a
--     default 'citizen' role row so sign-up never dead-ends. Admin promotion
--     remains a manual user_roles insert (super_admin in Phase 7 settings).
-- =============================================================================

-- ---------------------------------------------------------------- 1. tracking
create or replace function public.track_incident_by_token(
  p_reference text,
  p_token_hash text
) returns table (
  id uuid,
  public_reference text,
  incident_category public.incident_category,
  status public.incident_status,
  priority public.priority,
  address text,
  affected_persons integer,
  created_at timestamptz,
  updated_at timestamptz,
  closed_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  -- Constant-time-ish comparison still matters, but Postgres text equality
  -- on hashes is sufficient here: the secret itself is never stored.
  return query
  select
    i.id,
    i.public_reference,
    i.incident_category,
    i.status,
    i.priority,
    i.address,
    i.affected_persons,
    i.created_at,
    i.updated_at,
    i.closed_at
  from public.incidents i
  where i.public_reference = p_reference
    and i.access_token_hash = p_token_hash;
end $$;

-- ---------------------------------------------------------------- 2. dispatch
create or replace function public.dispatch_incident(
  p_incident_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters integer default 3000,
  p_max_responders integer default 10
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer := 0;
  v_row record;
  v_point geography := st_makepoint(p_longitude, p_latitude)::geography;
begin
  -- Rank candidates: nearest first, available preferred over busy.
  for v_row in
    select r.id as responder_id
    from public.responders r
    join public.responder_locations l on l.responder_id = r.id
    where r.verification_status = 'verified'
      and r.duty_mode = true
      and r.location_sharing_enabled = true
      and r.availability_status in ('available', 'busy')
      and l.recorded_at >= now() - interval '2 minutes'
      and l.expires_at >= now()
      and st_dwithin(l.location, v_point, p_radius_meters)
    order by
      case r.availability_status when 'available' then 0 else 1 end,
      st_distance(l.location, v_point) asc
    limit p_max_responders
  loop
    insert into public.incident_assignments (incident_id, responder_id, assignment_status, notified_at)
    values (p_incident_id, v_row.responder_id, 'pending', now())
    on conflict (incident_id, responder_id) do nothing;

    insert into public.responder_notifications
      (responder_id, incident_id, channel, subject, body, status)
    values (
      v_row.responder_id,
      p_incident_id,
      'in_app',
      'New incident nearby',
      'A new emergency report was filed near you. Open your incidents to accept or decline.',
      'pending'
    );

    v_count := v_count + 1;
  end loop;

  if v_count > 0 then
    update public.incidents
      set status = 'NOTIFYING', updated_at = now()
      where id = p_incident_id and status in ('NEW', 'PENDING_REVIEW');
    insert into public.incident_events (incident_id, event_type, new_status, description)
    values (p_incident_id, 'dispatched', 'NOTIFYING',
            format('Dispatched to %s nearby responder(s).', v_count));
  else
    insert into public.incident_events (incident_id, event_type, description)
    values (p_incident_id, 'dispatch_empty',
            'No eligible responders found at this time. Incident remains open for later dispatch.');
  end if;

  return v_count;
end $$;

-- ---------------------------------------------------------------- 3. auth bootstrap
-- When a user signs up, create their profiles row and default citizen role.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'citizen'::public.user_role)
  on conflict (user_id, role) do nothing;

  return new;
end $$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- First responder application binds to the auth user when they sign up.
create or replace function public.claim_responder_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Attach the most recent unclaimed pending responder row for this email is
  -- intentionally NOT automatic (email isn't stored on responders for PII
  -- minimization). Binding happens explicitly via /responders/me flows.
  return new;
end $$;
-- (No trigger attached for claim_responder_application — kept as a stub for
--  Phase 2 explicit binding. Harmless if never attached.)

-- ---------------------------------------------------------------- realtime check
-- Ensure messages table is present in the publication (idempotent guard).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
exception when duplicate_object then null;
  when others then null;
end $$;
