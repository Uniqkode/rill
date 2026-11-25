-- Run as the database owner in a test Supabase project after the migration.
-- The transaction rolls back the users, memberships, invitations and zone records.
begin;
do $test$
declare
  owner_id uuid := gen_random_uuid();
  viewer_id uuid := gen_random_uuid();
  operator_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  workspace_id uuid := gen_random_uuid();
  own_zone uuid := gen_random_uuid();
  viewer_email text := viewer_id::text || '@example.invalid';
  operator_email text := operator_id::text || '@example.invalid';
  viewer_invite uuid;
  operator_invite uuid;
  changes integer;
begin
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', account_id, 'authenticated', 'authenticated',
    account_id::text || '@example.invalid', now(), now(), now()
  from unnest(array[owner_id, viewer_id, operator_id, other_id]) as accounts(account_id);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform public.rill_create_workspace(workspace_id, 'Test irrigation workspace');
  perform public.rill_create_workspace(workspace_id, 'Test irrigation workspace');
  insert into public.rill_zones (id, workspace_id, name, place, value, owner, note)
  values (own_zone, workspace_id, 'Zone 1', 'Test farm', 120, 'Operator', 'Verify the allocation.');
  viewer_invite := public.rill_create_invite(workspace_id, viewer_email, 'viewer');
  operator_invite := public.rill_create_invite(workspace_id, operator_email, 'operator');

  perform set_config('request.jwt.claim.sub', other_id::text, true);
  if exists (select 1 from public.rill_zones where id = own_zone) or exists (select 1 from public.rill_workspaces) then
    raise exception 'An unrelated account can read a workspace.';
  end if;
  begin
    perform public.rill_accept_invite(viewer_invite);
    raise exception 'A different email can use the invitation.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.rill_create_workspace(workspace_id, 'Unrelated workspace');
    raise exception 'A different account can claim the workspace ID.';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  perform public.rill_accept_invite(viewer_invite);
  perform public.rill_accept_invite(viewer_invite);
  if not exists (select 1 from public.rill_zones where id = own_zone) then
    raise exception 'A viewer cannot read its workspace register.';
  end if;
  update public.rill_zones set note = 'Viewer update' where id = own_zone;
  get diagnostics changes = row_count;
  if changes <> 0 then raise exception 'A viewer can edit a zone.'; end if;
  begin
    perform public.rill_create_invite(workspace_id, operator_email, 'operator');
    raise exception 'A viewer can create an invitation.';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', operator_id::text, true);
  perform public.rill_accept_invite(operator_invite);
  update public.rill_zones set value = 140, status = 'Needs review' where id = own_zone and revision = 1;
  get diagnostics changes = row_count;
  if changes <> 1 then raise exception 'An operator cannot update a zone.'; end if;
  update public.rill_zones set note = 'Stale change' where id = own_zone and revision = 1;
  get diagnostics changes = row_count;
  if changes <> 0 then raise exception 'A stale revision can replace the current data.'; end if;
  if (select count(*) from public.rill_events where zone_id = own_zone) <> 2
    or not exists (select 1 from public.rill_events where zone_id = own_zone and actor_id = operator_id and status = 'Needs review') then
    raise exception 'Zone changes are missing their server-generated activity.';
  end if;

  execute 'reset role';
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform 1 from public.rill_zones;
    raise exception 'Anonymous reads are granted.';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
end;
$test$;
rollback;
