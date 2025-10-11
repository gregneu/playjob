-- Ensure realtime is fully enabled for ticket workflow tables.
-- This migration is idempotent and safe to rerun; it re-applies
-- publication membership and replica identity for the core tables
-- we rely on for drag & drop synchronisation.

do $$
declare
  target text;
begin
  -- Guarantee replica identity FULL so UPDATE events include complete payloads.
  foreach target in array array[
    'public.object_tickets',
    'public.zone_objects'
  ]
  loop
    begin
      execute format('alter table %s replica identity full', target);
      raise notice 'Replica identity set to FULL for %', target;
    exception
      when undefined_table then
        raise notice 'Skip replica identity – table % does not exist', target;
    end;
  end loop;

  -- Ensure the tables participate in the supabase_realtime publication.
  foreach target in array array[
    'public.object_tickets',
    'public.zone_objects',
    'public.zones',
    'public.zone_cells',
    'public.hex_cells',
    'public.buildings',
    'public.zone_object_links'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table %s', target);
      raise notice 'Added % to supabase_realtime publication', target;
    exception
      when duplicate_object then
        raise notice '% already present in supabase_realtime publication', target;
      when undefined_table then
        raise notice 'Skip publication add – table % missing', target;
      when undefined_object then
        raise notice 'Publication supabase_realtime not found; skip table %', target;
    end;
  end loop;
end
$$;

-- Quick validation snapshot (visible in migration logs).
select
  tablename,
  '✅ in publication' as publication_status
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in (
    'object_tickets',
    'zone_objects',
    'zones',
    'zone_cells',
    'hex_cells',
    'buildings',
    'zone_object_links'
  )
order by tablename;
