-- BPO Intelligence: additive application schema. Existing project data is preserved.
create schema if not exists bpo_private;
revoke all on schema bpo_private from public, anon;
grant usage on schema bpo_private to authenticated;

create table public.bpo_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.bpo_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.bpo_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);
create index bpo_members_user_idx on public.bpo_members(user_id, workspace_id);

create function bpo_private.can_access(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists(select 1 from public.bpo_workspaces w where w.id = target and w.owner_id = auth.uid())
    or exists(select 1 from public.bpo_members m where m.workspace_id = target and m.user_id = auth.uid())
  );
$$;
revoke all on function bpo_private.can_access(uuid) from public, anon;
grant execute on function bpo_private.can_access(uuid) to authenticated;

create table public.bpo_companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.bpo_workspaces(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  website text not null default '',
  domain text generated always as (lower(regexp_replace(split_part(regexp_replace(website, '^https?://', '', 'i'), '/', 1), '^www\.', '', 'i'))) stored,
  country text not null default '', industry text not null default '',
  employees integer check (employees >= 0),
  description text not null default '',
  services text[] not null default '{}',
  status text not null default 'New' check (status in ('New','Researching','Qualified','Needs review','Archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workspace_id,id)
);
create unique index bpo_company_domain_unique on public.bpo_companies(workspace_id,domain) where domain <> '';
create index bpo_companies_workspace_idx on public.bpo_companies(workspace_id,created_at desc);

create table public.bpo_contacts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.bpo_workspaces(id) on delete cascade,
  company_id uuid not null, name text not null check(length(trim(name)) between 1 and 200),
  title text not null default '', email text not null default '', phone text not null default '',
  linkedin_url text not null default '', source_url text not null default '',
  verification text not null default 'Unverified' check(verification in ('Unverified','Verified','Bounced')),
  notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(workspace_id,company_id) references public.bpo_companies(workspace_id,id) on delete cascade,
  unique(workspace_id,id)
);
create unique index bpo_contacts_email_unique on public.bpo_contacts(workspace_id,lower(email)) where email <> '';
create index bpo_contacts_company_idx on public.bpo_contacts(workspace_id,company_id);

create table public.bpo_campaigns (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.bpo_workspaces(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 200),
  country text not null default '', industry text not null default '',
  language text not null default 'English' check(language in ('English','German')),
  service text not null default 'Customer Support',
  query text not null default '',
  status text not null default 'Draft' check(status in ('Draft','Active','Paused','Completed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workspace_id,id)
);
create index bpo_campaigns_workspace_idx on public.bpo_campaigns(workspace_id,created_at desc);

create table public.bpo_leads (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.bpo_workspaces(id) on delete cascade,
  company_id uuid not null, campaign_id uuid,
  stage text not null default 'Discovered' check(stage in ('Discovered','Researching','Qualified','Contact identified','Draft prepared','Contacted','Replied','Meeting scheduled','Negotiation','Won','Lost')),
  value numeric(12,2) not null default 0 check(value >= 0), currency text not null default 'EUR' check(currency in ('EUR','USD','GBP','CAD','AUD','CHF')),
  owner_name text not null default '', next_action text not null default '', due_date date, notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(workspace_id,company_id) references public.bpo_companies(workspace_id,id) on delete cascade,
  foreign key(workspace_id,campaign_id) references public.bpo_campaigns(workspace_id,id),
  unique(workspace_id,company_id), unique(workspace_id,id)
);
create index bpo_leads_campaign_idx on public.bpo_leads(workspace_id,campaign_id);
create index bpo_leads_stage_idx on public.bpo_leads(workspace_id,stage);

create table public.bpo_evidence (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.bpo_workspaces(id) on delete cascade,
  company_id uuid not null,
  kind text not null check(kind in ('Hiring','Company size','Growth','Potential demand','Decision maker','Verified contact','Recent activity','Other')),
  title text not null check(length(trim(title)) between 1 and 300),
  source_url text not null check(source_url ~ '^https?://[^[:space:]]+$'),
  excerpt text not null default '', occurred_on date,
  verified boolean not null default false,
  acquired_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(workspace_id,company_id) references public.bpo_companies(workspace_id,id) on delete cascade,
  unique(workspace_id,id)
);
create index bpo_evidence_company_idx on public.bpo_evidence(workspace_id,company_id);

create table public.bpo_suppression (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.bpo_workspaces(id) on delete cascade,
  email text not null check(email <> '' and email = lower(trim(email))), reason text not null default 'Do not contact',
  created_at timestamptz not null default now(), unique(workspace_id,email)
);
create table public.bpo_outreach (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.bpo_workspaces(id) on delete cascade,
  company_id uuid not null, contact_id uuid, campaign_id uuid,
  language text not null default 'English' check(language in ('English','German')),
  subject text not null check(length(trim(subject)) between 1 and 300), body text not null check(length(trim(body)) between 1 and 20000),
  status text not null default 'Draft' check(status in ('Draft','Approved','Rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(workspace_id,company_id) references public.bpo_companies(workspace_id,id) on delete cascade,
  foreign key(workspace_id,contact_id) references public.bpo_contacts(workspace_id,id),
  foreign key(workspace_id,campaign_id) references public.bpo_campaigns(workspace_id,id)
);
create index bpo_outreach_company_idx on public.bpo_outreach(workspace_id,company_id);
create index bpo_outreach_contact_idx on public.bpo_outreach(workspace_id,contact_id);
create index bpo_outreach_campaign_idx on public.bpo_outreach(workspace_id,campaign_id);

create table public.bpo_research_runs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.bpo_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id), campaign_id uuid,
  query text not null, response_id text, status text not null default 'Starting' check(status in ('Starting','Running','Completed','Failed','Cancelled')),
  result jsonb not null default '{}', error text, imported_count integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(workspace_id,campaign_id) references public.bpo_campaigns(workspace_id,id)
);
create index bpo_research_workspace_idx on public.bpo_research_runs(workspace_id,created_at desc);
create index bpo_research_user_idx on public.bpo_research_runs(user_id);
create table public.bpo_activities (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.bpo_workspaces(id) on delete cascade,
  actor_id uuid default auth.uid(), entity text not null, entity_id uuid,
  action text not null, description text not null default '', created_at timestamptz not null default now()
);
create index bpo_activities_workspace_idx on public.bpo_activities(workspace_id,created_at desc);

create function bpo_private.audit_change() returns trigger language plpgsql set search_path = '' as $$
declare item record;
begin
  if tg_op = 'DELETE' then item := old; else item := new; end if;
  insert into public.bpo_activities(workspace_id,actor_id,entity,entity_id,action,description)
    values(item.workspace_id,auth.uid(),tg_table_name,item.id,tg_op,
      coalesce(to_jsonb(item)->>'name',to_jsonb(item)->>'title',to_jsonb(item)->>'subject',to_jsonb(item)->>'stage',''));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function bpo_private.audit_change() from public, anon;

create function bpo_private.touch_updated() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
revoke all on function bpo_private.touch_updated() from public, anon;

create function bpo_private.check_outreach() returns trigger language plpgsql set search_path = '' as $$
declare contact public.bpo_contacts;
begin
  if new.contact_id is not null then
    select * into contact from public.bpo_contacts where id=new.contact_id and workspace_id=new.workspace_id;
    if contact.company_id is distinct from new.company_id then raise exception 'Contact must belong to this company'; end if;
    if exists(select 1 from public.bpo_suppression where workspace_id=new.workspace_id and email=lower(contact.email)) then
      raise exception 'This contact is suppressed. Outreach is blocked.';
    end if;
    if new.status='Approved' and (contact.verification <> 'Verified' or contact.email='') then
      raise exception 'Verify the business email before approving a draft';
    end if;
  elsif new.status='Approved' then raise exception 'Select a verified contact before approving';
  end if;
  return new;
end; $$;
revoke all on function bpo_private.check_outreach() from public, anon;
create trigger bpo_check_outreach before insert or update on public.bpo_outreach for each row execute function bpo_private.check_outreach();

alter table public.bpo_workspaces enable row level security;
alter table public.bpo_members enable row level security;
grant select,insert,update,delete on public.bpo_workspaces to authenticated;
grant select,delete on public.bpo_members to authenticated;
revoke all on public.bpo_workspaces,public.bpo_members from anon;
create policy workspace_read on public.bpo_workspaces for select to authenticated using(bpo_private.can_access(id));
create policy workspace_create on public.bpo_workspaces for insert to authenticated with check(owner_id=(select auth.uid()));
create policy workspace_update on public.bpo_workspaces for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy workspace_delete on public.bpo_workspaces for delete to authenticated using(owner_id=(select auth.uid()));
create policy members_read on public.bpo_members for select to authenticated using(bpo_private.can_access(workspace_id));
create policy members_delete on public.bpo_members for delete to authenticated using(exists(select 1 from public.bpo_workspaces where id=workspace_id and owner_id=(select auth.uid())));

create function public.bpo_add_member(target_workspace uuid, member_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare target_user uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.bpo_workspaces where id=target_workspace and owner_id=auth.uid()) then
    raise exception 'Only the workspace owner can manage members';
  end if;
  select id into target_user from auth.users where lower(email)=lower(trim(member_email)) and email_confirmed_at is not null;
  if target_user is null then raise exception 'Ask this teammate to create and verify their account first'; end if;
  if target_user=auth.uid() then raise exception 'You already own this workspace'; end if;
  insert into public.bpo_members(workspace_id,user_id,email) values(target_workspace,target_user,lower(trim(member_email)))
    on conflict(workspace_id,user_id) do nothing;
end; $$;
revoke all on function public.bpo_add_member(uuid,text) from public,anon;
grant execute on function public.bpo_add_member(uuid,text) to authenticated;

do $$ declare tab text; begin
  foreach tab in array array['bpo_companies','bpo_contacts','bpo_campaigns','bpo_leads','bpo_evidence','bpo_suppression','bpo_outreach','bpo_activities','bpo_research_runs'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('revoke all on public.%I from anon',tab);
    execute format('grant select on public.%I to authenticated',tab);
    execute format('create policy member_read on public.%I for select to authenticated using(bpo_private.can_access(workspace_id))',tab);
    if tab not in ('bpo_research_runs') then
      execute format('grant insert on public.%I to authenticated',tab);
      execute format('create policy member_insert on public.%I for insert to authenticated with check(bpo_private.can_access(workspace_id))',tab);
    end if;
    if tab not in ('bpo_activities','bpo_research_runs') then
      execute format('grant update,delete on public.%I to authenticated',tab);
      execute format('create policy member_update on public.%I for update to authenticated using(bpo_private.can_access(workspace_id)) with check(bpo_private.can_access(workspace_id))',tab);
      execute format('create policy member_delete on public.%I for delete to authenticated using(bpo_private.can_access(workspace_id))',tab);
    end if;
    if tab not in ('bpo_activities','bpo_suppression') then
      execute format('create trigger touch_updated before update on public.%I for each row execute function bpo_private.touch_updated()',tab);
    end if;
    if tab not in ('bpo_activities','bpo_research_runs') then
      execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function bpo_private.audit_change()',tab);
    end if;
  end loop;
end $$;

-- Evidence coverage, not a prediction of outsourcing intent. Each category is counted once.
create view public.bpo_scores with(security_invoker=true) as
select c.id as company_id,c.workspace_id,
  coalesce(sum(e.weight),0)::integer as score,
  coalesce(jsonb_object_agg(e.kind,e.weight) filter(where e.kind is not null),'{}'::jsonb) as components
from public.bpo_companies c
left join (
  select workspace_id,company_id,kind,max(case kind
    when 'Hiring' then 25 when 'Company size' then 15 when 'Growth' then 15
    when 'Potential demand' then 20 when 'Decision maker' then 10
    when 'Verified contact' then 10 when 'Recent activity' then 5 else 0 end) as weight
  from public.bpo_evidence
  where verified and (kind <> 'Recent activity' or occurred_on >= current_date - 90)
  group by workspace_id,company_id,kind
) e on e.workspace_id=c.workspace_id and e.company_id=c.id
group by c.id,c.workspace_id;
grant select on public.bpo_scores to authenticated;
revoke all on public.bpo_scores from anon;
notify pgrst,'reload schema';

