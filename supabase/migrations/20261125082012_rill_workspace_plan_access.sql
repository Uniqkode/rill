begin;

alter table public.rill_workspaces
  add column plan text not null default 'free',
  add constraint rill_workspaces_plan_check check (plan in ('free', 'starter', 'growth', 'enterprise'));

create function rill_private.workspace_can_edit_zones(p_workspace_id uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1
    from public.rill_workspaces w
    where w.id = p_workspace_id
      and w.plan <> 'free'
      and rill_private.workspace_role(w.id) in ('owner', 'operator')
  );
$$;
revoke all on function rill_private.workspace_can_edit_zones(uuid) from public, anon, authenticated;
grant execute on function rill_private.workspace_can_edit_zones(uuid) to authenticated;

alter policy rill_zones_create_operator on public.rill_zones
  with check (rill_private.workspace_can_edit_zones(workspace_id));

alter policy rill_zones_update_operator on public.rill_zones
  using (rill_private.workspace_can_edit_zones(workspace_id))
  with check (rill_private.workspace_can_edit_zones(workspace_id));

notify pgrst, 'reload schema';

commit;
