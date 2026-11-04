-- =============================================================================
-- CIVIRESPOND — Migration 0002: Seed operating areas + demo data (development only)
-- =============================================================================
-- Only run this in an explicitly designated demo/development project.
-- It creates labelled simulated data; production must never contain it.
-- =============================================================================

insert into public.operating_areas (name, ward, district, centre)
values
  ('District 1 — Bến Thành', 'Bến Thành', 'District 1', st_makepoint(106.7008, 10.7769)::geography),
  ('District 3', null, 'District 3', st_makepoint(106.6995, 10.7829)::geography),
  ('Thủ Đức', null, 'Thủ Đức', st_makepoint(106.6372, 10.8491)::geography),
  ('Quận 7', null, 'Quận 7', st_makepoint(106.6930, 10.7308)::geography),
  ('Gò Vấp', null, 'Gò Vấp', st_makepoint(106.6534, 10.8385)::geography)
on conflict (name) do nothing;
