begin;

create schema if not exists rill_private;
revoke all on schema rill_private from public, anon, authenticated;
grant usage on schema rill_private to authenticated;

create table public.rill_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.rill_memberships (
  workspace_id uuid not null references public.rill_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'operator', 'viewer')),
  primary key (workspace_id, user_id)
);

create index rill_memberships_by_user on public.rill_memberships (user_id, workspace_id);

create table public.rill_zones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.rill_workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  place text not null check (char_length(btrim(place)) between 1 and 120),
  value numeric(8,1) not null check (value between 0.1 and 1000000),
  score smallint not null default 50 check (score between 0 and 100),
  status text not null default 'Scheduled' check (status in ('Scheduled', 'Needs review', 'Watered')),
  owner text not null check (char_length(btrim(owner)) between 1 and 80),
  note text not null check (char_length(btrim(note)) between 1 and 1500),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

create index rill_zones_by_workspace on public.rill_zones (workspace_id, id);

create table public.rill_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.rill_workspaces(id) on delete cascade,
  zone_id uuid not null,
  zone_name text not null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('Zone added', 'Status changed', 'Zone updated')),
  status text not null,
  occurred_at timestamptz not null default now()
);

create index rill_events_by_workspace on public.rill_events (workspace_id, occurred_at desc, id desc);

create table public.rill_invites (
  token_hash bytea primary key,
  workspace_id uuid not null references public.rill_workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('operator', 'viewer')),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);

alter table public.rill_workspaces enable row level security;
alter table public.rill_memberships enable row level security;
alter table public.rill_zones enable row level security;
alter table public.rill_events enable row level security;
alter table public.rill_invites enable row level security;

revoke all on public.rill_workspaces, public.rill_memberships, public.rill_zones,
  public.rill_events, public.rill_invites from public, anon, authenticated;
grant select on public.rill_workspaces, public.rill_memberships, public.rill_zones, public.rill_events to authenticated;
grant insert (id, workspace_id, name, place, value, score, status, owner, note) on public.rill_zones to authenticated;
grant update (value, score, status, note) on public.rill_zones to authenticated;

-- Definers read membership outside its own policy to avoid recursive RLS checks.
create function rill_private.workspace_role(p_workspace_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.rill_memberships
  where workspace_id = p_workspace_id and user_id = (select auth.uid());
$$;
revoke all on function rill_private.workspace_role(uuid) from public, anon, authenticated;
grant execute on function rill_private.workspace_role(uuid) to authenticated;

create function rill_private.verified_email()
returns text
language sql stable security definer set search_path = ''
as $$
  select lower(email) from auth.users
  where id = (select auth.uid()) and email_confirmed_at is not null and email is not null;
$$;
revoke all on function rill_private.verified_email() from public, anon, authenticated;

create policy rill_memberships_read_self on public.rill_memberships for select to authenticated
  using (user_id = (select auth.uid()));
create policy rill_workspaces_read_member on public.rill_workspaces for select to authenticated
  using (rill_private.workspace_role(id) is not null);
create policy rill_zones_read_member on public.rill_zones for select to authenticated
  using (rill_private.workspace_role(workspace_id) is not null);
create policy rill_zones_create_operator on public.rill_zones for insert to authenticated
  with check (rill_private.workspace_role(workspace_id) in ('owner', 'operator'));
create policy rill_zones_update_operator on public.rill_zones for update to authenticated
  using (rill_private.workspace_role(workspace_id) in ('owner', 'operator'))
  with check (rill_private.workspace_role(workspace_id) in ('owner', 'operator'));
create policy rill_events_read_member on public.rill_events for select to authenticated
  using (rill_private.workspace_role(workspace_id) is not null);

create function public.rill_create_workspace(p_id uuid, p_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
  if rill_private.verified_email() is null then
    raise exception using errcode = '42501', message = 'A verified account is required.';
  end if;
  if p_id is null or p_name is null or char_length(btrim(p_name)) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Enter a workspace name between 1 and 100 characters.';
  end if;

  insert into public.rill_workspaces (id, name) values (p_id, btrim(p_name))
    on conflict (id) do nothing;
  if found then
    insert into public.rill_memberships (workspace_id, user_id, role) values (p_id, auth.uid(), 'owner');
  elsif rill_private.workspace_role(p_id) is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'This workspace ID is unavailable.';
  end if;
  return p_id;
end;
$$;
revoke all on function public.rill_create_workspace(uuid, text) from public, anon, authenticated;
grant execute on function public.rill_create_workspace(uuid, text) to authenticated;

create function public.rill_create_invite(p_workspace_id uuid, p_email text, p_role text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  token uuid := gen_random_uuid();
  invite_email text := lower(btrim(p_email));
begin
  if rill_private.workspace_role(p_workspace_id) is distinct from 'owner' then
    raise exception using errcode = '42501', message = 'Only the workspace owner can invite members.';
  end if;
  if p_role is null or p_role not in ('operator', 'viewer')
    or invite_email is null or char_length(invite_email) not between 3 and 254
    or position('@' in invite_email) < 2 then
    raise exception using errcode = '22023', message = 'Enter an email and select a valid role.';
  end if;

  insert into public.rill_invites (token_hash, workspace_id, email, role, expires_at)
  values (sha256(convert_to(token::text, 'UTF8')), p_workspace_id, invite_email, p_role, now() + interval '7 days');
  return token;
end;
$$;
revoke all on function public.rill_create_invite(uuid, text, text) from public, anon, authenticated;
grant execute on function public.rill_create_invite(uuid, text, text) to authenticated;

create function public.rill_accept_invite(p_token uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  invitation public.rill_invites%rowtype;
  account_email text := rill_private.verified_email();
begin
  select * into invitation from public.rill_invites
  where token_hash = sha256(convert_to(p_token::text, 'UTF8')) for update;

  if not found or account_email is null or account_email <> invitation.email then
    raise exception using errcode = '42501', message = 'This invite is unavailable for your Google account.';
  end if;
  if invitation.used_at is not null then
    if invitation.used_by = auth.uid() and rill_private.workspace_role(invitation.workspace_id) is not null then
      return invitation.workspace_id;
    end if;
    raise exception using errcode = '42501', message = 'This invite has already been used.';
  end if;
  if invitation.expires_at <= now() then
    raise exception using errcode = '42501', message = 'This invite has expired.';
  end if;

  insert into public.rill_memberships (workspace_id, user_id, role)
  values (invitation.workspace_id, auth.uid(), invitation.role)
  on conflict (workspace_id, user_id) do nothing;
  update public.rill_invites set used_by = auth.uid(), used_at = now() where token_hash = invitation.token_hash;
  return invitation.workspace_id;
end;
$$;
revoke all on function public.rill_accept_invite(uuid) from public, anon, authenticated;
grant execute on function public.rill_accept_invite(uuid) to authenticated;

create function rill_private.stamp_zone_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  -- Preserve the revision on a retry that applies the very same values.
  if new is distinct from old then
    new.revision := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke all on function rill_private.stamp_zone_update() from public, anon, authenticated;
create trigger rill_stamp_zone_update before update on public.rill_zones
  for each row execute function rill_private.stamp_zone_update();

create function rill_private.record_zone_event()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  event_action text;
begin
  if tg_op = 'INSERT' then
    event_action := 'Zone added';
  elsif new.revision = old.revision then
    return new;
  elsif new.status is distinct from old.status then
    event_action := 'Status changed';
  else
    event_action := 'Zone updated';
  end if;

  insert into public.rill_events (workspace_id, zone_id, zone_name, actor_id, action, status)
  values (new.workspace_id, new.id, new.name, auth.uid(), event_action, new.status);
  return new;
end;
$$;
revoke all on function rill_private.record_zone_event() from public, anon, authenticated;
create trigger rill_record_zone_event after insert or update on public.rill_zones
  for each row execute function rill_private.record_zone_event();

commit;
