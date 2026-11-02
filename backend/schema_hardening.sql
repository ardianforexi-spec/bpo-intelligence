-- Workspace isolation, suppression lifecycle and privileged helper boundaries.
alter function public.bpo_add_member(uuid,text) set schema bpo_private;
create function public.bpo_add_member(target_workspace uuid,member_email text) returns void
language sql security invoker set search_path='' as $$
  select bpo_private.bpo_add_member(target_workspace,member_email);
$$;
revoke all on function public.bpo_add_member(uuid,text) from public,anon;
grant execute on function public.bpo_add_member(uuid,text) to authenticated;

drop policy member_insert on public.bpo_activities;
create policy member_insert on public.bpo_activities for insert to authenticated
  with check(bpo_private.can_access(workspace_id) and actor_id=(select auth.uid()));

alter table public.bpo_companies add constraint bpo_company_website_check check(website='' or website ~ '^https?://[^[:space:]]+$');
alter table public.bpo_contacts add constraint bpo_contact_email_check check(email='' or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
alter table public.bpo_contacts add constraint bpo_contact_verification_check check(verification<>'Verified' or (email<>'' and source_url ~ '^https?://[^[:space:]]+$'));
alter table public.bpo_evidence add constraint bpo_evidence_date_check check(occurred_on is null or occurred_on<=current_date);
alter table public.bpo_research_runs add column imported_at timestamptz;
create index bpo_workspaces_owner_idx on public.bpo_workspaces(owner_id);
create index bpo_members_workspace_idx on public.bpo_members(workspace_id);

create or replace function bpo_private.check_outreach() returns trigger language plpgsql set search_path = '' as $$
declare contact public.bpo_contacts;
begin
  if new.contact_id is not null then
    select * into contact from public.bpo_contacts where id=new.contact_id and workspace_id=new.workspace_id;
    if contact.company_id is distinct from new.company_id then raise exception 'Contact must belong to this company'; end if;
    if new.status<>'Rejected' and exists(select 1 from public.bpo_suppression where workspace_id=new.workspace_id and email=lower(contact.email)) then
      raise exception 'This contact is suppressed. Outreach is blocked.';
    end if;
    if new.status='Approved' and (contact.verification <> 'Verified' or contact.email='') then
      raise exception 'Verify the business email before approving a draft';
    end if;
  elsif new.status='Approved' then raise exception 'Select a verified contact before approving';
  end if;
  return new;
end; $$;

create function bpo_private.suppress_drafts() returns trigger language plpgsql set search_path='' as $$
begin
  update public.bpo_outreach set status='Rejected'
    where workspace_id=new.workspace_id and status<>'Rejected' and contact_id in
      (select id from public.bpo_contacts where workspace_id=new.workspace_id and lower(email)=new.email);
  return new;
end; $$;
revoke all on function bpo_private.suppress_drafts() from public,anon;
create trigger bpo_suppress_drafts after insert or update on public.bpo_suppression for each row execute function bpo_private.suppress_drafts();

create function bpo_private.invalidate_drafts() returns trigger language plpgsql set search_path='' as $$
begin
  if new.verification<>'Verified' or new.email is distinct from old.email or new.company_id is distinct from old.company_id then
    update public.bpo_outreach set status='Rejected' where workspace_id=old.workspace_id and contact_id=old.id and status='Approved';
  end if;
  return new;
end; $$;
revoke all on function bpo_private.invalidate_drafts() from public,anon;
create trigger bpo_invalidate_contact_drafts before update on public.bpo_contacts for each row execute function bpo_private.invalidate_drafts();

create or replace function bpo_private.audit_change() returns trigger language plpgsql set search_path = '' as $$
declare item record;
begin
  if tg_op = 'DELETE' then item := old; else item := new; end if;
  if exists(select 1 from public.bpo_workspaces where id=item.workspace_id) then
    insert into public.bpo_activities(workspace_id,actor_id,entity,entity_id,action,description)
      values(item.workspace_id,auth.uid(),tg_table_name,item.id,tg_op,
        coalesce(to_jsonb(item)->>'name',to_jsonb(item)->>'title',to_jsonb(item)->>'subject',to_jsonb(item)->>'stage',''));
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
notify pgrst,'reload schema';

