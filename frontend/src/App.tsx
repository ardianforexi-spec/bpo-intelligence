import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Activity, ArrowRight, Bot, Building2, ChartNoAxesCombined, ChevronRight, FileUp, Globe2, Layers3, LayoutDashboard, LogOut, Mail, Menu, Plus, RefreshCw, Settings, ShieldCheck, Target, Users, Workflow, X } from 'lucide-react'
import { AuthScreen } from './components/AuthScreen'
import { CompanyProfile } from './components/CompanyProfile'
import { DeleteDialog, draftTemplate, RecordEditor } from './components/RecordEditor'
import { ActivityList, Analytics, Overview, Pipeline, RecordTable } from './components/DataPanels'
import { ResearchPanel } from './components/ResearchPanel'
import { ImportPanel, MarketsPanel, WorkspaceSettings } from './components/WorkspaceSettings'
import { modules, type Module } from './lib/modules'
import { authConfigured, emptySnapshot, loadSnapshot, message, removeRow, saveRow, str, supabase, type Row } from './lib/supabase'

const navigation = [
  ['Overview',LayoutDashboard],['AI Research',Bot],['Markets',Globe2],['Companies',Building2],['Leads',Target],['Contacts',Users],['Evidence',ShieldCheck],['Campaigns',Target],['Pipeline',Workflow],['Outreach',Mail],['Analytics',ChartNoAxesCombined],['Activity',Activity],['Import',FileUp],['Suppression',ShieldCheck],['Settings',Settings],
] as const
const descriptions: Record<string,string> = {
  Overview:'Your team, your prospects, your next move.', 'AI Research':'Discover real companies with public source evidence.', Markets:'Explore your configured target markets.',Pipeline:'Move each opportunity from discovery to a real conversation.',Analytics:'Accurate totals from the records your team has saved.',Activity:'A shared history of changes in your workspace.',Import:'Bring existing companies and contacts into your workspace.',Settings:'Manage your workspace, teammates, account and exports.',
}
type Editor = { module: Module; record?: Row; initial?: Record<string,unknown> }

export default function App() {
  const [session,setSession]=useState<Session|null>(null);const [authLoading,setAuthLoading]=useState(true);const [recovery,setRecovery]=useState(false)
  const [workspaces,setWorkspaces]=useState<Row[]>([]);const [workspaceId,setWorkspaceId]=useState('');const [workspaceLoading,setWorkspaceLoading]=useState(false)
  const [workspaceLoaded,setWorkspaceLoaded]=useState(false);const [data,setData]=useState(emptySnapshot);const [loading,setLoading]=useState(false)
  const [page,setPage]=useState('Overview');const [mobile,setMobile]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('')
  const [profile,setProfile]=useState<Row|null>(null);const [editor,setEditor]=useState<Editor|null>(null);const [deleting,setDeleting]=useState<{module:Module;row:Row}|null>(null)
  const [newWorkspace,setNewWorkspace]=useState(false);const [research,setResearch]=useState({query:'',campaign:''});const [researchEnabled,setResearchEnabled]=useState(false)
  const pending=useRef<AbortController|null>(null)
  useEffect(()=>{
    if(!authConfigured){setAuthLoading(false);return}
    let alive=true
    supabase.auth.getSession().then(({data,error})=>{if(alive){if(error)setError(message(error));setSession(data.session);setAuthLoading(false)}})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{setSession(next);setAuthLoading(false);if(event==='PASSWORD_RECOVERY')setRecovery(true);if(event==='SIGNED_OUT'){setWorkspaces([]);setWorkspaceId('');setData(emptySnapshot());setWorkspaceLoaded(false)}})
    return()=>{alive=false;subscription.unsubscribe()}
  },[])
  const userId=session?.user.id
  const loadWorkspaces=useCallback(async()=>{
    if(!userId)return
    setWorkspaceLoading(true)
    try{
      const {data,error}=await supabase.from('bpo_workspaces').select('*').order('created_at')
      if(error)throw error
      const rows=(data||[]) as Row[];setWorkspaces(rows)
      setWorkspaceId(previous=>rows.some(row=>row.id===previous)?previous:rows[0]?.id||'')
      setWorkspaceLoaded(true)
    }catch(error){setError(message(error))}finally{setWorkspaceLoading(false)}
  },[userId])
  useEffect(()=>{void loadWorkspaces()},[loadWorkspaces])
  const refresh=useCallback(async()=>{
    if(!workspaceId)return
    pending.current?.abort();const controller=new AbortController();pending.current=controller;setLoading(true)
    try{const next=await loadSnapshot(workspaceId,controller.signal);if(!controller.signal.aborted)setData(next)}
    catch(error){if(!controller.signal.aborted)setError(message(error))}finally{if(!controller.signal.aborted)setLoading(false)}
  },[workspaceId])
  useEffect(()=>{setData(emptySnapshot());setProfile(null);setEditor(null);setDeleting(null);void refresh();return()=>pending.current?.abort()},[refresh])
  useEffect(()=>{
    const controller=new AbortController()
    const base=(import.meta.env.VITE_API_BASE_URL||'/api/v1').replace(/\/$/,'')
    fetch(`${base}/capabilities`,{signal:controller.signal}).then(r=>r.json()).then(result=>setResearchEnabled(Boolean(result.research))).catch(()=>{})
    return()=>controller.abort()
  },[])
  const workspace=workspaces.find(row=>row.id===workspaceId)
  const module=modules[page]
  function navigate(next:string){setPage(next);setMobile(false);setError('');setNotice('')}
  function beginResearch(query:string,campaign=''){setResearch({query,campaign});navigate('AI Research')}
  async function addLead(company:Row){try{await saveRow('leads',workspaceId,{company_id:company.id});setNotice(`${str(company,'name')} added to the pipeline.`);await refresh()}catch(error){setError(message(error))}}
  const label=module?.label||page
  if(authLoading)return <div className="app-loading"><Layers3 size={34}/><p>Opening your workspace…</p></div>
  if(!session||recovery)return <AuthScreen recovery={recovery} onRecovered={()=>setRecovery(false)}/>
  if(!workspaceLoaded||workspaceLoading&&!workspace)return <div className="app-loading"><RefreshCw size={28} className="spin"/><p>Loading workspaces…</p>{error&&<><div role="alert">{error}</div><button className="primary-button" onClick={loadWorkspaces}>Retry</button></>}</div>
  if(!workspace)return <div className="onboarding"><div className="brand"><span className="brand-mark"><Layers3/></span><span>BPO<span className="brand-subtitle">INTELLIGENCE</span></span></div><h1>Welcome to your next chapter.</h1><p>Create a workspace to start adding companies, contacts and opportunities.</p><CreateWorkspace onCreated={loadWorkspaces}/><p className="help-text">Joining a team? Ask the workspace owner to add {session.user.email}, then refresh.</p><button className="secondary-button" onClick={loadWorkspaces}>Refresh team access</button><button className="text-button" onClick={()=>supabase.auth.signOut()}>Sign out</button></div>
  return <div className="app-shell crm-app">
    {mobile&&<button className="sidebar-scrim" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
    <aside className={`sidebar ${mobile?'is-open':''}`}><div className="brand"><span className="brand-mark"><Layers3 size={23}/></span><span>BPO<span className="brand-subtitle">INTELLIGENCE</span></span></div>
      <label className="sr-only" htmlFor="workspace-switch">Current workspace</label><div className="workspace-picker"><select id="workspace-switch" value={workspaceId} onChange={e=>setWorkspaceId(e.target.value)}>{workspaces.map(row=><option key={row.id} value={row.id}>{str(row,'name')}</option>)}</select><button title="Create another workspace" aria-label="Create another workspace" onClick={()=>setNewWorkspace(true)}><Plus size={16}/></button></div>
      <div className="nav-label">WORKSPACE</div><nav aria-label="Main navigation">{navigation.map(([name,Icon])=><button key={name} className={`nav-item ${page===name?'active':''}`} onClick={()=>navigate(name)} aria-current={page===name?'page':undefined}><Icon size={17}/><span>{modules[name]?.label||name}</span>{name==='Outreach'&&data.outreach.some(r=>r.status==='Draft')&&<span className="nav-count">{data.outreach.filter(r=>r.status==='Draft').length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="foundation-note"><ShieldCheck size={18}/><strong>Evidence-led. Human-reviewed.</strong><p>Real records. Clear sources. Every message stays a draft.</p></div><div className="profile"><div className="profile-avatar">{session.user.email?.slice(0,2).toUpperCase()}</div><span>{session.user.email?.split('@')[0]}<small>{workspace.owner_id===session.user.id?'Workspace owner':'Team member'}</small></span><button className="icon-button" title="Sign out" aria-label="Sign out" onClick={async()=>{const {error}=await supabase.auth.signOut();if(error)setError(message(error))}}><LogOut size={16}/></button></div></div>
    </aside><div className="main-shell"><header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" onClick={()=>setMobile(true)} aria-label="Open navigation"><Menu size={20}/></button><span>{str(workspace,'name')}</span><ChevronRight size={13}/><strong>{label}</strong></div><div className="topbar-right"><span className="environment"><span/>Connected workspace</span><button className="icon-button" onClick={()=>{setError('');void refresh()}} disabled={loading} title="Refresh records" aria-label="Refresh records"><RefreshCw size={17} className={loading?'spin':''}/></button><span className="top-avatar">{session.user.email?.slice(0,2).toUpperCase()}</span></div></header>
      <main><div className="page-heading"><div><span className="eyebrow">BPO INTELLIGENCE / WORKSPACE</span><h1>{label}</h1><p>{module?.description||descriptions[page]}</p></div>{page==='Overview'&&<button className="primary-button" onClick={()=>setEditor({module:modules.Companies})}><Plus size={16}/>Add company</button>}</div>
        {error&&<div className="error-banner" role="alert"><span>{error}</span><button className="icon-button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}{notice&&<div className="notice" role="status">{notice}<button className="icon-button" onClick={()=>setNotice('')} aria-label="Dismiss notification"><X size={15}/></button></div>}
        {loading&&<div className="loading-strip" role="status"><RefreshCw size={13} className="spin"/>Refreshing workspace records…</div>}
        {module&&<RecordTable key={`${workspaceId}-${page}`} module={module} data={data} onOpen={module.entity==='companies'?setProfile:undefined} onAdd={()=>setEditor({module})} onEdit={record=>setEditor({module,record})} onDelete={row=>setDeleting({module,row})} onLead={addLead} onDraft={company=>setEditor({module:modules.Outreach,initial:draftTemplate(company,['Germany','Austria','Switzerland'].includes(str(company,'country'))?'German':'English')})} onEvidence={company=>setEditor({module:modules.Evidence,initial:{company_id:company.id}})} onResearch={campaign=>beginResearch([str(campaign,'query'),`Market: ${str(campaign,'country')}; industry: ${str(campaign,'industry')}; service: ${str(campaign,'service')}. Find sourced prospects suited to 10–20 agents.`].join('\n'),campaign.id)}/>}
        {page==='Overview'&&<Overview data={data} onNavigate={navigate} onAdd={()=>setEditor({module:modules.Companies})}/>}
        {page==='Pipeline'&&<Pipeline data={data} workspace={workspaceId} onSaved={refresh} onEdit={record=>setEditor({module:modules.Leads,record})} onError={error=>setError(message(error))}/>}
        {page==='Analytics'&&<Analytics data={data}/>}{page==='Activity'&&<section className="panel dashboard-panel"><ActivityList data={data} limit={500}/></section>}
        {page==='AI Research'&&<ResearchPanel key={`${workspaceId}-${research.query}-${research.campaign}`} data={data} workspace={workspaceId} initialQuery={research.query} campaignId={research.campaign} onSaved={refresh} enabled={researchEnabled}/>}
        {page==='Markets'&&<MarketsPanel data={data} onResearch={beginResearch}/>}{page==='Import'&&<ImportPanel key={workspaceId} workspace={workspaceId} data={data} onSaved={refresh}/>}
        {page==='Settings'&&<WorkspaceSettings key={workspaceId} workspace={workspace} data={data} user={session.user} onSaved={refresh} onWorkspaceCreated={loadWorkspaces} researchEnabled={researchEnabled}/>}
        <footer className="page-footer"><span><ShieldCheck size={13}/>Private workspace · Source-backed research</span><span>BPO Intelligence · Kosovo · English & German</span></footer>
      </main></div>
    {profile&&<CompanyProfile company={profile} data={data} onClose={()=>setProfile(null)} onEdit={()=>{setEditor({module:modules.Companies,record:profile});setProfile(null)}} onAddContact={()=>{setEditor({module:modules.Contacts,initial:{company_id:profile.id}});setProfile(null)}} onAddEvidence={()=>{setEditor({module:modules.Evidence,initial:{company_id:profile.id}});setProfile(null)}} onDraft={()=>{setEditor({module:modules.Outreach,initial:draftTemplate(profile,'English')});setProfile(null)}}/>}
    {editor&&<RecordEditor key={`${editor.module.entity}-${editor.record?.id||'new'}`} module={editor.module} record={editor.record} initial={editor.initial} workspace={workspaceId} data={data} onClose={()=>setEditor(null)} onSaved={()=>{setNotice('Record saved.');void refresh()}}/>}
    {deleting&&<DeleteDialog label={deleting.module.singular} onClose={()=>setDeleting(null)} onConfirm={async()=>{await removeRow(deleting.module.entity,workspaceId,deleting.row.id);setNotice('Record deleted.');await refresh()}}/>}
    {newWorkspace&&<div className="workspace-create-overlay"><section className="panel"><button className="icon-button" aria-label="Close" onClick={()=>setNewWorkspace(false)}><X size={18}/></button><CreateWorkspace onCreated={async()=>{await loadWorkspaces();setNewWorkspace(false)}}/></section></div>}
  </div>
}

function CreateWorkspace({onCreated}:{onCreated:()=>Promise<void>}){
  const [name,setName]=useState('BPO Intelligence');const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  async function create(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const {error}=await supabase.from('bpo_workspaces').insert({name:name.trim()});if(error)throw error;await onCreated()}catch(error){setError(message(error))}finally{setBusy(false)}}
  return <form className="create-workspace-form" onSubmit={create}><label>Workspace name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>{error&&<div role="alert" className="error-banner">{error}</div>}<button disabled={busy} className="primary-button">{busy?'Creating…':'Create workspace'}<ArrowRight size={16}/></button></form>
}


