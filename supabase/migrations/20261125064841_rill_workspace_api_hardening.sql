begin;

alter table public.rill_invites set schema rill_private;

alter function public.rill_create_workspace(uuid, text) set schema rill_private;
alter function public.rill_create_invite(uuid, text, text) set schema rill_private;
alter function public.rill_accept_invite(uuid) set schema rill_private;

create or replace function rill_private.rill_create_invite(p_workspace_id uuid, p_email text, p_role text)
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

  insert into rill_private.rill_invites (token_hash, workspace_id, email, role, expires_at)
  values (sha256(convert_to(token::text, 'UTF8')), p_workspace_id, invite_email, p_role, now() + interval '7 days');
  return token;
end;
$$;

create or replace function rill_private.rill_accept_invite(p_token uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  invitation rill_private.rill_invites%rowtype;
  account_email text := rill_private.verified_email();
begin
  select * into invitation from rill_private.rill_invites
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
  update rill_private.rill_invites set used_by = auth.uid(), used_at = now() where token_hash = invitation.token_hash;
  return invitation.workspace_id;
end;
$$;

-- Expose only invoker functions to the Data API. The private routines enforce membership and verified email.
create function public.rill_create_workspace(p_id uuid, p_name text)
returns uuid
language sql security invoker set search_path = ''
as $$
  select rill_private.rill_create_workspace(p_id, p_name);
$$;
revoke all on function public.rill_create_workspace(uuid, text) from public, anon, authenticated;
grant execute on function public.rill_create_workspace(uuid, text) to authenticated;

create function public.rill_create_invite(p_workspace_id uuid, p_email text, p_role text)
returns uuid
language sql security invoker set search_path = ''
as $$
  select rill_private.rill_create_invite(p_workspace_id, p_email, p_role);
$$;
revoke all on function public.rill_create_invite(uuid, text, text) from public, anon, authenticated;
grant execute on function public.rill_create_invite(uuid, text, text) to authenticated;

create function public.rill_accept_invite(p_token uuid)
returns uuid
language sql security invoker set search_path = ''
as $$
  select rill_private.rill_accept_invite(p_token);
$$;
revoke all on function public.rill_accept_invite(uuid) from public, anon, authenticated;
grant execute on function public.rill_accept_invite(uuid) to authenticated;

create index rill_events_by_actor on public.rill_events (actor_id);
create index rill_invites_by_workspace on rill_private.rill_invites (workspace_id);
create index rill_invites_by_redeemer on rill_private.rill_invites (used_by);

commit;
