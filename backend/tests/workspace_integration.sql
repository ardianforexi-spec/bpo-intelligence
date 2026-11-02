-- Real PostgreSQL checks. All fixtures roll back; no emails or external messages.
begin;
do $$
declare
  user_a uuid := gen_random_uuid(); user_b uuid := gen_random_uuid();
  workspace_a uuid := gen_random_uuid(); workspace_b uuid := gen_random_uuid();
  company_a uuid := gen_random_uuid(); company_b uuid := gen_random_uuid();
  contact_a uuid := gen_random_uuid(); draft_a uuid := gen_random_uuid();
  count_value integer; blocked boolean; status_value text;
begin
  insert into auth.users(id,email,email_confirmed_at) values
    (user_a,'bpo-qa-a-'||user_a||'@example.invalid',now()),
    (user_b,'bpo-qa-b-'||user_b||'@example.invalid',now());
  insert into public.bpo_workspaces(id,name,owner_id) values(workspace_a,'QA workspace A',user_a),(workspace_b,'QA workspace B',user_b);
  insert into public.bpo_companies(id,workspace_id,name,website) values
    (company_a,workspace_a,'QA company A','https://qa-a.example.invalid'),
    (company_b,workspace_b,'QA company B','https://qa-b.example.invalid');

  perform set_config('request.jwt.claims',json_build_object('sub',user_a,'role','authenticated')::text,true);
  set local role authenticated;
  select count(*) into count_value from public.bpo_companies;
  if count_value<>1 then raise exception 'FAIL: workspace isolation (expected 1, got %)',count_value; end if;
  update public.bpo_companies set name='QA updated' where id=company_a;
  if not found then raise exception 'FAIL: own company update'; end if;
  update public.bpo_companies set name='Should not change' where id=company_b;
  if found then raise exception 'FAIL: cross-workspace update allowed'; end if;
  blocked:=false;
  begin
    insert into public.bpo_contacts(workspace_id,company_id,name) values(workspace_a,company_b,'Wrong workspace');
  exception when foreign_key_violation then blocked:=true;
  end;
  if not blocked then raise exception 'FAIL: cross-workspace association allowed'; end if;

  insert into public.bpo_contacts(id,workspace_id,company_id,name,email,source_url,verification)
    values(contact_a,workspace_a,company_a,'QA contact','qa@example.invalid','https://qa-a.example.invalid/contact','Verified');
  insert into public.bpo_outreach(id,workspace_id,company_id,contact_id,subject,body,status)
    values(draft_a,workspace_a,company_a,contact_a,'QA draft','QA body','Approved');
  insert into public.bpo_suppression(workspace_id,email) values(workspace_a,'qa@example.invalid');
  select status into status_value from public.bpo_outreach where id=draft_a;
  if status_value<>'Rejected' then raise exception 'FAIL: suppression did not withdraw approved draft'; end if;
  blocked:=false;
  begin
    update public.bpo_outreach set status='Approved' where id=draft_a;
  exception when raise_exception then blocked:=true;
  end;
  if not blocked then raise exception 'FAIL: suppressed draft could be approved'; end if;

  insert into public.bpo_evidence(workspace_id,company_id,kind,title,source_url,verified)
    values(workspace_a,company_a,'Hiring','QA finding','https://qa-a.example.invalid/jobs',false);
  select score into count_value from public.bpo_scores where company_id=company_a;
  if count_value<>0 then raise exception 'FAIL: unverified evidence awarded points'; end if;
  update public.bpo_evidence set verified=true where company_id=company_a;
  insert into public.bpo_evidence(workspace_id,company_id,kind,title,source_url,verified)
    values(workspace_a,company_a,'Hiring','Duplicate category','https://qa-a.example.invalid/careers',true);
  select score into count_value from public.bpo_scores where company_id=company_a;
  if count_value<>25 then raise exception 'FAIL: evidence category score expected 25, got %',count_value; end if;

  perform public.bpo_add_member(workspace_a,'bpo-qa-b-'||user_b||'@example.invalid');
  reset role;
  perform set_config('request.jwt.claims',json_build_object('sub',user_b,'role','authenticated')::text,true);
  set local role authenticated;
  select count(*) into count_value from public.bpo_companies;
  if count_value<>2 then raise exception 'FAIL: teammate cannot access shared workspace'; end if;
  blocked:=false;
  begin perform public.bpo_add_member(workspace_a,'bpo-qa-a-'||user_a||'@example.invalid');
  exception when raise_exception then blocked:=true;
  end;
  if not blocked then raise exception 'FAIL: member could manage access'; end if;
  blocked:=false;
  begin insert into public.bpo_research_runs(workspace_id,user_id,query) values(workspace_a,user_b,'Untrusted client');
  exception when insufficient_privilege then blocked:=true;
  end;
  if not blocked then raise exception 'FAIL: client could forge research jobs'; end if;
  reset role;
  set local role anon;
  blocked:=false;
  begin perform 1 from public.bpo_companies;
  exception when insufficient_privilege then blocked:=true;
  end;
  if not blocked then raise exception 'FAIL: anonymous CRM access'; end if;
  reset role;
end $$;
rollback;
select 'PASS: CRUD, workspace isolation, composite FKs, suppression, scoring, member privileges, anonymous access; fixtures rolled back' as verification;


