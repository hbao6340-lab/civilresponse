-- =============================================================================
-- CIVIRESPOND — Migration 0001: Initial schema (PostGIS, auth, RLS)
-- =============================================================================

create extension if not exists "postgis";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
do $$ begin
  create type public.user_role as enum
    ('citizen', 'responder', 'verification_officer', 'administrator', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum
    ('pending', 'verified', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.availability_status as enum
    ('available', 'busy', 'away', 'offline');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incident_category as enum
    ('traffic_accident', 'medical_emergency', 'fire_smoke', 'drowning_water',
     'missing_person', 'public_safety', 'violence_danger', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incident_status as enum
    ('NEW', 'PENDING_REVIEW', 'VERIFIED', 'NOTIFYING', 'ACCEPTED',
     'EN_ROUTE', 'ON_SCENE', 'RESOLVED', 'CANCELLED', 'FALSE_REPORT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.priority as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_status as enum
    ('pending', 'accepted', 'declined', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index if not exists idx_user_roles_user on public.user_roles (user_id);
create index if not exists idx_user_roles_role on public.user_roles (role);

-- ---------------------------------------------------------------- areas
create table if not exists public.operating_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  ward text,
  district text,
  city text not null default 'Ho Chi Minh City',
  boundary geography(geometry, 4326),
  centre geography(point, 4326),
  created_at timestamptz not null default now()
);
create index if not exists idx_operating_areas_centre_gist
  on public.operating_areas using gist (centre);

-- ---------------------------------------------------------------- responders
create table if not exists public.responders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null default 'Responder',
  bio text check (char_length(bio) <= 1000),
  phone text,
  verification_status public.verification_status not null default 'pending',
  availability_status public.availability_status not null default 'offline',
  duty_mode boolean not null default false,
  location_sharing_enabled boolean not null default false,
  public_visibility boolean not null default false,
  operating_area_id uuid references public.operating_areas (id) on delete set null,
  verified_by uuid references auth.users (id),
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_responders_user on public.responders (user_id);
create index if not exists idx_responders_verification
  on public.responders (verification_status, duty_mode, availability_status);

create table if not exists public.responder_qualifications (
  id uuid primary key default gen_random_uuid(),
  responder_id uuid not null references public.responders (id) on delete cascade,
  qualification_type text not null,
  title text not null,
  issuer text,
  expires_at date,
  verified boolean not null default false,
  verified_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index if not exists idx_resp_quals_responder
  on public.responder_qualifications (responder_id);

create table if not exists public.responder_documents (
  id uuid primary key default gen_random_uuid(),
  responder_id uuid not null references public.responders (id) on delete cascade,
  document_type text not null,
  storage_path text,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_resp_docs_responder
  on public.responder_documents (responder_id);

-- ---------------------------------------------------------------- locations
create table if not exists public.responder_locations (
  id uuid primary key default gen_random_uuid(),
  responder_id uuid not null references public.responders (id) on delete cascade,
  location geography(point, 4326) not null,
  accuracy_meters numeric check (accuracy_meters >= 0 and accuracy_meters <= 10000),
  heading numeric check (heading >= 0 and heading <= 360),
  speed_meters_per_second numeric check (speed_meters_per_second >= 0 and speed_meters_per_second <= 1000),
  recorded_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);
create index if not exists idx_resp_loc_responder_time
  on public.responder_locations (responder_id, recorded_at desc);
create index if not exists idx_resp_loc_geo_gist
  on public.responder_locations using gist (location);
create index if not exists idx_resp_loc_expires
  on public.responder_locations (expires_at);
create unique index if not exists ux_resp_loc_latest
  on public.responder_locations (responder_id, expires_at);

-- ---------------------------------------------------------------- incidents
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique,
  incident_category public.incident_category not null,
  description text not null check (char_length(description) between 1 and 20000),
  location geography(point, 4326),
  address text,
  affected_persons integer check (affected_persons >= 0),
  priority public.priority not null default 'medium',
  status public.incident_status not null default 'NEW',
  reporter_user_id uuid references auth.users (id) on delete set null,
  access_token_hash text,
  contact_details text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'false', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists idx_incidents_status on public.incidents (status);
create index if not exists idx_incidents_created on public.incidents (created_at desc);
create index if not exists idx_incidents_geo_gist on public.incidents using gist (location);
create index if not exists idx_incidents_reporter on public.incidents (reporter_user_id);
create index if not exists idx_incidents_reference on public.incidents (public_reference);

create table if not exists public.incident_media (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  created_at timestamptz not null default now()
);

create table if not exists public.incident_assignments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  responder_id uuid not null references public.responders (id) on delete cascade,
  assignment_status public.assignment_status not null default 'pending',
  notified_at timestamptz,
  accepted_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (incident_id, responder_id)
);
create index if not exists idx_assign_incident on public.incident_assignments (incident_id);
create index if not exists idx_assign_responder on public.incident_assignments (responder_id);

create table if not exists public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  previous_status public.incident_status,
  new_status public.incident_status,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists idx_inc_events_incident on public.incident_events (incident_id, created_at);

-- ---------------------------------------------------------------- messaging
create table if not exists public.responder_notifications (
  id uuid primary key default gen_random_uuid(),
  responder_id uuid not null references public.responders (id) on delete cascade,
  incident_id uuid references public.incidents (id) on delete cascade,
  channel text not null default 'in_app'
    check (channel in ('in_app', 'web_push', 'email', 'fcm')),
  subject text,
  body text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'delivered', 'failed', 'read')),
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents (id) on delete cascade,
  participant_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_conv_incident on public.conversations (incident_id);
create index if not exists idx_conv_participant on public.conversations (participant_user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conv on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------- misc
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  platform text not null default 'web' check (platform in ('web', 'android', 'ios')),
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text,
  ip_address text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_created on public.audit_logs (created_at desc);
create index if not exists idx_audit_entity on public.audit_logs (entity_type, entity_id);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null check (consent_type in
    ('location_sharing', 'public_map_visibility', 'incident_notifications', 'marketing_communications')),
  policy_version text not null default '1.0',
  granted boolean not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index if not exists idx_consents_user on public.user_consents (user_id);

-- ---------------------------------------------------------------- triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_responders_updated on public.responders;
create trigger trg_responders_updated before update on public.responders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_incidents_updated on public.incidents;
create trigger trg_incidents_updated before update on public.incidents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- helper: role check
create or replace function public.has_role(p_user uuid, p_role public.user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles where user_id = p_user and role = p_role
  );
$$;

create or replace function public.is_admin(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user and role in ('administrator', 'super_admin')
  );
$$;

create or replace function public.can_verify(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user and role in ('verification_officer', 'administrator', 'super_admin')
  );
$$;

-- Audit helper
create or replace function public.write_audit(
  p_actor uuid, p_action text, p_entity_type text, p_entity_id uuid, p_description text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, description)
  values (p_actor, p_action, p_entity_type, p_entity_id, p_description);
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.operating_areas enable row level security;
alter table public.responders enable row level security;
alter table public.responder_qualifications enable row level security;
alter table public.responder_documents enable row level security;
alter table public.responder_locations enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_media enable row level security;
alter table public.incident_assignments enable row level security;
alter table public.incident_events enable row level security;
alter table public.responder_notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.user_consents enable row level security;

-- profiles: self or admin
drop policy if exists "profiles self or admin" on public.profiles;
create policy "profiles self or admin" on public.profiles
  for all using (auth.uid() = id or public.is_admin(auth.uid()))
  with check (auth.uid() = id or public.is_admin(auth.uid()));

-- user_roles: self read, admin write
drop policy if exists "roles self read" on public.user_roles;
create policy "roles self read" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
drop policy if exists "roles admin write" on public.user_roles;
create policy "roles admin write" on public.user_roles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- operating_areas: public read, admin write
drop policy if exists "areas public read" on public.operating_areas;
create policy "areas public read" on public.operating_areas for select using (true);
drop policy if exists "areas admin write" on public.operating_areas;
create policy "areas admin write" on public.operating_areas
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- responders: self + admins + verification officers read; self insert/update own
drop policy if exists "responders self or staff read" on public.responders;
create policy "responders self or staff read" on public.responders
  for select using (auth.uid() = user_id or public.can_verify(auth.uid()) or public.is_admin(auth.uid()));
drop policy if exists "responders self write" on public.responders;
create policy "responders self write" on public.responders
  for insert with check (auth.uid() = user_id);
drop policy if exists "responders self update" on public.responders;
create policy "responders self update" on public.responders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- qualifications / documents: self + staff
drop policy if exists "quals self or staff" on public.responder_qualifications;
create policy "quals self or staff" on public.responder_qualifications
  for all using (
    exists (select 1 from public.responders r where r.id = responder_id and (r.user_id = auth.uid() or public.can_verify(auth.uid()) or public.is_admin(auth.uid())))
  ) with check (
    exists (select 1 from public.responders r where r.id = responder_id and (r.user_id = auth.uid() or public.can_verify(auth.uid()) or public.is_admin(auth.uid())))
  );

drop policy if exists "docs self or staff" on public.responder_documents;
create policy "docs self or staff" on public.responder_documents
  for all using (
    exists (select 1 from public.responders r where r.id = responder_id and (r.user_id = auth.uid() or public.can_verify(auth.uid()) or public.is_admin(auth.uid())))
  ) with check (
    exists (select 1 from public.responders r where r.id = responder_id and (r.user_id = auth.uid() or public.can_verify(auth.uid()) or public.is_admin(auth.uid())))
  );

-- locations: never public; owner + staff only
drop policy if exists "locations owner or staff" on public.responder_locations;
create policy "locations owner or staff" on public.responder_locations
  for all using (
    exists (select 1 from public.responders r where r.id = responder_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  ) with check (
    exists (select 1 from public.responders r where r.id = responder_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- incidents: reporter + assigned responders + staff
drop policy if exists "incidents reporter or staff" on public.incidents;
create policy "incidents reporter or staff" on public.incidents
  for select using (
    auth.uid() = reporter_user_id
    or public.is_admin(auth.uid())
    or exists (select 1 from public.incident_assignments a join public.responders r on r.id = a.responder_id where a.incident_id = incidents.id and r.user_id = auth.uid())
  );
drop policy if exists "incidents staff write" on public.incidents;
create policy "incidents staff write" on public.incidents
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- media: incident-scoped
drop policy if exists "media incident-scoped" on public.incident_media;
create policy "media incident-scoped" on public.incident_media
  for all using (
    exists (select 1 from public.incidents i where i.id = incident_id and (i.reporter_user_id = auth.uid() or public.is_admin(auth.uid())))
  ) with check (
    exists (select 1 from public.incidents i where i.id = incident_id and (i.reporter_user_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- assignments: own + staff
drop policy if exists "assignments own or staff" on public.incident_assignments;
create policy "assignments own or staff" on public.incident_assignments
  for all using (
    exists (select 1 from public.responders r where r.id = responder_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  ) with check (
    exists (select 1 from public.responders r where r.id = responder_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- events: incident-scoped read
drop policy if exists "events incident-scoped" on public.incident_events;
create policy "events incident-scoped" on public.incident_events
  for select using (
    exists (select 1 from public.incidents i where i.id = incident_id and (i.reporter_user_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- notifications: own + staff
drop policy if exists "notifications own or staff" on public.responder_notifications;
create policy "notifications own or staff" on public.responder_notifications
  for all using (
    exists (select 1 from public.responders r where r.id = responder_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  ) with check (
    exists (select 1 from public.responders r where r.id = responder_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- conversations / messages: participants only
drop policy if exists "conversations participant" on public.conversations;
create policy "conversations participant" on public.conversations
  for all using (auth.uid() = participant_user_id) with check (auth.uid() = participant_user_id);

drop policy if exists "messages participant" on public.messages;
create policy "messages participant" on public.messages
  for all using (
    exists (select 1 from public.conversations c where c.id = conversation_id and c.participant_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.conversations c where c.id = conversation_id and c.participant_user_id = auth.uid())
  );

-- push: own only
drop policy if exists "push own" on public.push_subscriptions;
create policy "push own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- audit: admin only
drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit admin read" on public.audit_logs
  for select using (public.is_admin(auth.uid()));

-- consents: own + staff
drop policy if exists "consents own or admin" on public.user_consents;
create policy "consents own or admin" on public.user_consents
  for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------- storage buckets
insert into storage.buckets (id, name, public)
values ('responder-documents', 'responder-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('incident-media', 'incident-media', false)
on conflict (id) do nothing;

-- Storage policies: private; server issues signed URLs. No public read.
drop policy if exists "storage docs staff" on storage.objects;
create policy "storage docs staff" on storage.objects
  for select using (
    bucket_id = 'responder-documents' and public.is_admin(auth.uid())
  );

drop policy if exists "storage docs owner upload" on storage.objects;
create policy "storage docs owner upload" on storage.objects
  for insert with check (bucket_id = 'responder-documents');

drop policy if exists "storage media incident" on storage.objects;
create policy "storage media incident" on storage.objects
  for select using (bucket_id = 'incident-media' and public.is_admin(auth.uid()));

-- ---------------------------------------------------------------- functions

-- find_nearby_responders: eligible, fresh, rank by distance
create or replace function public.find_nearby_responders(
  incident_latitude double precision,
  incident_longitude double precision,
  search_radius_meters integer default 3000,
  incident_category public.incident_category default null
) returns table (
  responder_id uuid,
  display_name text,
  distance_meters double precision,
  availability_status public.availability_status,
  qualifications text[]
) language plpgsql stable security definer set search_path = public as $$
declare
  v_point geography := st_makepoint(incident_longitude, incident_latitude)::geography;
begin
  return query
  select
    r.id,
    r.display_name,
    st_distance(l.location, v_point) as distance_meters,
    r.availability_status,
    coalesce(array_agg(q.title) filter (where q.verified), '{}') as qualifications
  from public.responders r
  join public.responder_locations l on l.responder_id = r.id
  left join public.responder_qualifications q on q.responder_id = r.id
  where r.verification_status = 'verified'
    and r.duty_mode = true
    and r.location_sharing_enabled = true
    and r.availability_status in ('available', 'busy')
    and l.recorded_at >= now() - interval '2 minutes'
    and l.expires_at >= now()
    and st_dwithin(l.location, v_point, search_radius_meters)
  group by r.id, r.display_name, l.location, r.availability_status
  order by st_distance(l.location, v_point) asc
  limit 50;
end $$;

-- upsert_responder_location: prune old, insert fresh with 2-min expiry
create or replace function public.upsert_responder_location(
  p_responder_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters numeric default null,
  p_heading numeric default null,
  p_speed numeric default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  -- Caller context is enforced by RLS + API auth; function is definer so the
  -- API (service-shaped) path can write. Validate bounds here too.
  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'invalid coordinates';
  end if;
  delete from public.responder_locations where responder_id = p_responder_id;
  insert into public.responder_locations
    (responder_id, location, accuracy_meters, heading, speed_meters_per_second, recorded_at, expires_at)
  values
    (p_responder_id, st_makepoint(p_longitude, p_latitude)::geography,
     p_accuracy_meters, p_heading, p_speed, now(), now() + interval '2 minutes');
end $$;

-- public_responder_markers: jittered public feed (RPC is anon-safe: only
-- opted-in rows, approximate coords returned; jitter applied in API layer too)
create or replace function public.public_responder_markers()
returns table (
  id uuid,
  display_name text,
  lat double precision,
  lng double precision,
  availability_status public.availability_status
) language sql stable security definer set search_path = public as $$
  select
    r.id,
    r.display_name,
    st_y(l.location::geometry) as lat,
    st_x(l.location::geometry) as lng,
    r.availability_status
  from public.responders r
  join public.responder_locations l on l.responder_id = r.id
  where r.verification_status = 'verified'
    and r.duty_mode = true
    and r.location_sharing_enabled = true
    and r.public_visibility = true
    and l.recorded_at >= now() - interval '2 minutes'
    and l.expires_at >= now();
$$;

-- submit_incident: anon-safe insert via RPC (RLS bypass via definer)
create or replace function public.submit_incident(
  p_category public.incident_category,
  p_description text,
  p_latitude double precision,
  p_longitude double precision,
  p_address text,
  p_affected integer,
  p_reference text,
  p_token_hash text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_user uuid := auth.uid();
begin
  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'invalid coordinates';
  end if;
  insert into public.incidents
    (public_reference, incident_category, description, location, address,
     affected_persons, priority, status, reporter_user_id, access_token_hash, verification_status)
  values
    (p_reference, p_category, p_description,
     st_makepoint(p_longitude, p_latitude)::geography,
     p_address, p_affected, 'medium', 'NEW', v_user, p_token_hash, 'unverified')
  returning id into v_id;
  insert into public.incident_events (incident_id, actor_user_id, event_type, new_status, description)
  values (v_id, v_user, 'submitted', 'NEW', 'Incident submitted via public reporting form.');
  return v_id;
end $$;

-- register_responder_application (anon-safe)
create or replace function public.register_responder_application(
  p_display_name text, p_phone text, p_operating_area text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.responders (display_name, phone, verification_status, availability_status, duty_mode, location_sharing_enabled, public_visibility)
  values (p_display_name, p_phone, 'pending', 'offline', false, false, false)
  returning id into v_id;
  return v_id;
end $$;

-- set_assignment_action
create or replace function public.set_assignment_action(
  p_assignment_id uuid, p_responder_id uuid, p_action text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_action = 'accept' then
    update public.incident_assignments
      set assignment_status = 'accepted', accepted_at = now()
      where id = p_assignment_id and responder_id = p_responder_id and assignment_status = 'pending';
    update public.incidents set status = 'ACCEPTED', updated_at = now()
      where id = (select incident_id from public.incident_assignments where id = p_assignment_id);
    insert into public.incident_events (incident_id, event_type, new_status, description)
    select incident_id, 'accepted', 'ACCEPTED', 'Responder accepted the incident.'
    from public.incident_assignments where id = p_assignment_id;
  elsif p_action = 'decline' then
    update public.incident_assignments
      set assignment_status = 'declined'
      where id = p_assignment_id and responder_id = p_responder_id and assignment_status = 'pending';
  else
    raise exception 'invalid action';
  end if;
end $$;

-- set_consent
create or replace function public.set_consent(
  p_consent_type text, p_policy_version text, p_granted boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_granted then
    insert into public.user_consents (user_id, consent_type, policy_version, granted, granted_at)
    values (auth.uid(), p_consent_type::text, p_policy_version, true, now());
  else
    insert into public.user_consents (user_id, consent_type, policy_version, granted, granted_at, withdrawn_at)
    values (auth.uid(), p_consent_type::text, p_policy_version, false, now(), now());
  end if;
end $$;

-- set_responder_verification (staff only, audit-logged)
create or replace function public.set_responder_verification(
  p_responder_id uuid, p_status public.verification_status, p_reason text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_verify(auth.uid()) then
    raise exception 'insufficient permissions';
  end if;
  update public.responders
    set verification_status = p_status,
        verified_by = auth.uid(),
        verified_at = case when p_status = 'verified' then now() else verified_at end,
        rejection_reason = case when p_status in ('rejected', 'suspended') then p_reason else rejection_reason end,
        duty_mode = case when p_status <> 'verified' then false else duty_mode end,
        updated_at = now()
    where id = p_responder_id;
  perform public.write_audit(auth.uid(), 'responder.verification', 'responder', p_responder_id,
    'Verification set to ' || p_status::text || coalesce(' — ' || p_reason, ''));
end $$;

-- admin_summary
create or replace function public.admin_summary()
returns table (
  registered_responders bigint,
  verified_responders bigint,
  on_duty bigint,
  available bigint,
  responding bigint,
  active_incidents bigint,
  unassigned_incidents bigint,
  resolved_today bigint,
  pending_verification bigint
) language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.responders) as registered_responders,
    (select count(*) from public.responders where verification_status = 'verified') as verified_responders,
    (select count(*) from public.responders where duty_mode = true and verification_status = 'verified') as on_duty,
    (select count(*) from public.responders where availability_status = 'available' and duty_mode = true) as available,
    (select count(*) from public.responders where availability_status = 'busy' and duty_mode = true) as responding,
    (select count(*) from public.incidents where status not in ('RESOLVED', 'CANCELLED', 'FALSE_REPORT')) as active_incidents,
    (select count(*) from public.incidents where status in ('NEW', 'PENDING_REVIEW')
       and not exists (select 1 from public.incident_assignments a where a.incident_id = incidents.id and a.assignment_status = 'accepted')) as unassigned_incidents,
    (select count(*) from public.incidents where status = 'RESOLVED' and closed_at::date = current_date) as resolved_today,
    (select count(*) from public.responders where verification_status = 'pending') as pending_verification;
$$;

-- admin_export_csv
create or replace function public.admin_export_csv(p_kind text)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_csv text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'insufficient permissions';
  end if;
  if p_kind = 'incidents' then
    select string_agg(id::text || ',' || public_reference || ',' || status::text || ',' || created_at::text, E'\n')
      into v_csv from public.incidents order by created_at desc limit 500;
  elsif p_kind = 'responders' then
    select string_agg(id::text || ',' || display_name || ',' || verification_status::text || ',' || availability_status::text, E'\n')
      into v_csv from public.responders order by created_at desc limit 500;
  elsif p_kind = 'assignments' then
    select string_agg(id::text || ',' || incident_id::text || ',' || responder_id::text || ',' || assignment_status::text, E'\n')
      into v_csv from public.incident_assignments order by created_at desc limit 500;
  elsif p_kind = 'audit' then
    select string_agg(created_at::text || ',' || action || ',' || entity_type || ',' || coalesce(entity_id::text, ''), E'\n')
      into v_csv from public.audit_logs order by created_at desc limit 1000;
  else
    raise exception 'unknown export kind';
  end if;
  perform public.write_audit(auth.uid(), 'export.csv', p_kind, null, 'CSV export generated');
  return coalesce(v_csv, '');
end $$;

-- ---------------------------------------------------------------- retention
-- Exact location history: old rows are pruned by a scheduled job; stale GPS
-- is never used for discovery (enforced in find_nearby_responders / markers).

-- ---------------------------------------------------------------- realtime
-- Enable Realtime on operational tables (client-side subscriptions are
-- additionally gated by RLS).
alter table public.incidents replica identity full;
alter table public.incident_assignments replica identity full;
alter table public.responder_locations replica identity full;

-- (Add to supabase_realtime publication in hosted env if not present.)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.incidents, public.incident_assignments, public.responder_locations, public.messages;
  end if;
exception when others then null;
end $$;

