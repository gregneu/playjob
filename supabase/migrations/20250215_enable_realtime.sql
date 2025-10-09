-- Enable realtime streaming for core project tables and ensure updates emit full rows.

-- Helper procedure to set replica identity to FULL when table exists.
do $$
declare
  target text;
begin
  foreach target in array array[
    'public.projects',
    'public.zones',
    'public.zone_cells',
    'public.hex_cells',
    'public.buildings',
    'public.zone_objects',
    'public.object_tickets',
    'public.zone_object_links',
    'public.project_memberships',
    'public.project_invites'
  ]
  loop
    begin
      execute format('alter table %s replica identity full', target);
    exception
      when undefined_table then
        raise notice 'Skipped replica identity update – table % does not exist', target;
      when others then
        raise;
    end;
  end loop;
end
$$;

-- Helper procedure to add tables to supabase_realtime publication if available.
do $$
declare
  target text;
begin
  foreach target in array array[
    'public.projects',
    'public.zones',
    'public.zone_cells',
    'public.hex_cells',
    'public.buildings',
    'public.zone_objects',
    'public.object_tickets',
    'public.zone_object_links',
    'public.project_memberships',
    'public.project_invites'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table %s', target);
    exception
      when undefined_object then
        raise notice 'Publication supabase_realtime missing; skipped adding %', target;
      when duplicate_object then
        raise notice 'Table % already present in supabase_realtime publication', target;
      when undefined_table then
        raise notice 'Skipped adding % to publication – table missing', target;
      when others then
        raise;
    end;
  end loop;
end
$$;
