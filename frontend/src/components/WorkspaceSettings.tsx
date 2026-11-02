import { useRef, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { ArrowDownToLine, FileUp, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { download, message, parseCsv, saveRow, str, supabase, type Row, type Snapshot } from '../lib/supabase'
import { countries, services } from '../lib/modules'

export function WorkspaceSettings({ workspace, data, user, onSaved, onWorkspaceCreated, researchEnabled }: {
  workspace: Row; data: Snapshot; user: User; onSaved: () => Promise<void>; onWorkspaceCreated: () => Promise<void>; researchEnabled: boolean
}) {
  const [name,setName]=useState(str(workspace,'name'));const [email,setEmail]=useState('');const [busy,setBusy]=useState('');const [error,setError]=useState('');const [notice,setNotice]=useState('');const [password,setPassword]=useState('')
  async function task(key:string,action:()=>Promise<void>) {setBusy(key);setError('');setNotice('');try{await action()}catch(error){setError(message(error))}finally{setBusy('')}}
  const owner=workspace.owner_id===user.id
  return <div className="settings-grid">{error && <div role="alert" className="error-banner full">{error}</div>}{notice && <div role="status" className="notice full">{notice}</div>}
    <section className="panel settings-card"><h2>Workspace</h2><p>Members share CRM records, evidence, drafts and research history.</p><form onSubmit={e => {e.preventDefault();task('rename',async()=>{const {error}=await supabase.from('bpo_workspaces').update({name}).eq('id',workspace.id);if(error)throw error;await onWorkspaceCreated();setNotice('Workspace name updated.')})}}><label>Workspace name<input required maxLength={120} value={name} disabled={!owner} onChange={e=>setName(e.target.value)}/></label><button disabled={!owner || Boolean(busy)} className="primary-button">Save workspace</button></form>
    <p className="help-text">{owner ? 'You are the workspace owner.' : 'Only the workspace owner can change the name and manage members.'}</p></section>
    <section className="panel settings-card"><h2>Your account</h2><p>{user.email}</p><form onSubmit={e=>{e.preventDefault();task('password',async()=>{const {error}=await supabase.auth.updateUser({password});if(error)throw error;setPassword('');setNotice('Password updated.')})}}><label>New password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={Boolean(busy)} className="secondary-button">Update password</button></form></section>
    <section className="panel settings-card full"><h2>Team access</h2><p>Ask your teammate to create and verify an account first. Add their email below to grant access to this workspace. This action does not send an email.</p>
      {owner && <form className="inline-form" onSubmit={e=>{e.preventDefault();task('member',async()=>{const {error}=await supabase.rpc('bpo_add_member',{target_workspace:workspace.id,member_email:email});if(error)throw error;setEmail('');await onSaved();setNotice('Teammate added. They can select this workspace after signing in.')})}}><label className="sr-only" htmlFor="member-email">Teammate email</label><input id="member-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="teammate@company.com"/><button disabled={Boolean(busy)} className="primary-button"><Plus size={15}/>Add teammate</button></form>}
      <div className="member-list"><div><span>Workspace owner</span><span className="pill good">Owner</span></div>{data.members.map(member=><div key={member.id}><span>{str(member,'email')}</span><span className="pill">Member</span>{owner && <button disabled={Boolean(busy)} aria-label={`Remove ${str(member,'email')}`} className="icon-button" onClick={()=>{if(window.confirm(`Remove access for ${str(member,'email')}?`))task(member.id,async()=>{const {error}=await supabase.from('bpo_members').delete().eq('id',member.id).eq('workspace_id',workspace.id);if(error)throw error;await onSaved()})}}><Trash2 size={16}/></button>}</div>)}</div>
    </section><section className="panel settings-card"><h2>Configuration</h2><div className="configuration-row"><span>Database</span><span className="pill good">Supabase</span></div><div className="configuration-row"><span>AI web research</span><span className={`pill ${researchEnabled?'good':'warning'}`}>{researchEnabled?'Configured':'API key required'}</span></div><div className="configuration-row"><span>Automatic sending</span><span className="pill">Off â€” drafts only</span></div><p className="help-text">Provider keys are server settings. Store OPENAI_API_KEY in Vercel Production as Sensitive. OPENAI_MODEL is optional; the default is gpt-5-mini.</p></section>
    <section className="panel settings-card"><h2>Export your workspace</h2><p>Download a JSON archive of all your workspace records. Keep exported contact data private.</p><button className="secondary-button" onClick={()=>download('bpo-workspace.json',JSON.stringify({exported_at:new Date().toISOString(),workspace,data},null,2),'application/json')}><ArrowDownToLine size={15}/>Download JSON archive</button><p className="help-text">CSV exports are available in each module. JSON archives are for backup/reference; use CSV import to add companies and contacts.</p></section>
  </div>
}

export function ImportPanel({ workspace, data, onSaved }: { workspace: string; data: Snapshot; onSaved: () => Promise<void> }) {
  const [entity,setEntity]=useState<'companies'|'contacts'>('companies');const [records,setRecords]=useState<Record<string,string>[]>([]);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const file=useRef<HTMLInputElement>(null)
  const headers=entity==='companies'?['name','website','country','industry','employees','description']:['name','company_website','title','email','phone','source_url','notes']
  async function read(input:File|undefined){setError('');setNotice('');setRecords([]);if(!input)return;try{if(input.size>2_000_000)throw new Error('Choose a CSV smaller than 2 MB.');const parsed=parseCsv(await input.text());if(parsed.length>1000)throw new Error('Import at most 1,000 records at a time.');if(!parsed.length)throw new Error('The CSV is empty.');if(!('name' in parsed[0]))throw new Error('A name column is required.');setRecords(parsed)}catch(error){setError(message(error))}}
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');setNotice('');try{
    const normalize=(url:string)=>url.toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0]
    const prepared=records.map((record,index)=>{
      if(!record.name)throw new Error(`Row ${index+2}: name is required.`)
      if(entity==='companies'){
        if(record.website && !/^https?:\/\//.test(record.website))throw new Error(`Row ${index+2}: website must start with https:// or http://.`)
        if(record.employees && (!/^\d+$/.test(record.employees)||Number(record.employees)>2147483647))throw new Error(`Row ${index+2}: employees must be a positive whole number.`)
        return {name:record.name,website:record.website||'',country:record.country||'',industry:record.industry||'',description:record.description||'',employees:record.employees?Number(record.employees):null}
      }
      const company=data.companies.find(c=>str(c,'domain')===normalize(record.company_website||'') && record.company_website)
      if(!company)throw new Error(`Row ${index+2}: company_website does not match an existing company. Import companies first.`)
      if(record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email))throw new Error(`Row ${index+2}: invalid email.`)
      return {company_id:company.id,name:record.name,title:record.title||'',email:record.email?.toLowerCase()||'',phone:record.phone||'',source_url:record.source_url||'',notes:record.notes||'',verification:'Unverified'}
    })
    let imported=0,skipped=0
    for(const values of prepared){try{await saveRow(entity,workspace,values);imported++}catch(error){if(/already exists/.test(message(error)))skipped++;else throw new Error(`${imported} saved before this error: ${message(error)}. Fix the file and retry; duplicates are skipped.`)}}
    setNotice(`${imported} records imported; ${skipped} duplicates skipped.`);setRecords([]);if(file.current)file.current.value='';await onSaved()
  }catch(error){setError(message(error));await onSaved()}finally{setBusy(false)}}
  return <section className="panel import-panel"><div className="research-heading"><div className="research-icon"><FileUp size={25}/></div><div><h2>Bring your real data</h2><p>Import UTF-8 CSV files from Excel, Google Sheets or your existing CRM.</p></div></div><div className="import-steps"><span><ShieldCheck size={16}/>Duplicates are skipped</span><span>Contacts start unverified</span><span>Suppression remains in place</span></div>
    <form onSubmit={submit}><label>Record type<select value={entity} disabled={busy} onChange={e=>{setEntity(e.target.value as 'companies'|'contacts');setRecords([]);setError('');setNotice('');if(file.current)file.current.value=''}}><option value="companies">Companies</option><option value="contacts">Contacts</option></select></label><button type="button" className="secondary-button" onClick={()=>download(`bpo-${entity}-template.csv`,'\uFEFF'+headers.join(',')+'\r\n','text/csv;charset=utf-8')}><ArrowDownToLine size={15}/>Download CSV template</button><label className="file-drop">Choose CSV file<input ref={file} type="file" accept=".csv,text/csv" disabled={busy} onChange={e=>read(e.target.files?.[0])}/></label>
    {entity==='contacts' && <p className="help-text">The company_website column must match an existing company's website. Import companies first.</p>}
    {error && <div role="alert" className="error-banner">{error}</div>}{notice && <div role="status" className="notice">{notice}</div>}
    {records.length>0 && <><div className="section-heading"><h2>Preview Â· {records.length} records</h2><span className="small-text muted">First 10 rows</span></div><div className="market-table-wrap"><table className="crm-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{records.slice(0,10).map((row,index)=><tr key={index}>{headers.map(h=><td key={h}>{row[h]||'â€”'}</td>)}</tr>)}</tbody></table></div><button className="primary-button" disabled={busy}>{busy?'Importingâ€¦':`Import ${records.length} ${entity}`}</button></>}
    </form><p className="help-text">Maximum 1,000 rows and 2 MB per file. Unknown facts should be left blank. CSV exports open in Excel; native .xlsx upload is not supported.</p>
  </section>
}

export function MarketsPanel({ data, onResearch }: {data:Snapshot;onResearch:(query:string)=>void}) {
  return <div className="market-cards">{countries.filter(c=>!['Kosovo','Other'].includes(c)).map(country=><section className="panel market-card" key={country}><span className="eyebrow">TARGET MARKET</span><h2>{country}</h2><p>{['Germany','Austria','Switzerland'].includes(country)?'German / English':'English'}</p><strong>{data.companies.filter(c=>c.country===country).length}<small> saved companies</small></strong><button className="secondary-button" onClick={()=>onResearch(`Find up to 5 companies in ${country} with sourced public evidence of customer support or back-office hiring that might fit a Kosovo outsourcing team of 10â€“20 agents. Do not infer outsourcing intent.`)}>Research market</button></section>)}<section className="panel market-card full"><h2>Our delivery services</h2><div className="service-tags">{services.map(s=><span key={s}>{s}</span>)}</div><p>10â€“20 agents Â· English and German Â· Kosovo</p></section></div>
}

