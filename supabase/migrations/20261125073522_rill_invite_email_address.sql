begin;

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
    raise exception using errcode = '42501', message = 'This invite is unavailable for your email address.';
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

commit;
