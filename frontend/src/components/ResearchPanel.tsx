import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Bot, Check, Download, RefreshCw, Search, Square } from 'lucide-react'
import { apiAction, message, str, type Snapshot } from '../lib/supabase'
import { safeUrl } from './DataPanels'

type Candidate = { name: string; website: string; country: string; description: string; evidence: { kind: string; title: string; source_url: string; excerpt: string }[] }
type ResearchResult = { summary?: string; companies?: Candidate[]; sources?: string[] }
export function ResearchPanel({ data, workspace, initialQuery='', campaignId='', onSaved, enabled }: {
  data: Snapshot; workspace: string; initialQuery?: string; campaignId?: string; onSaved: () => Promise<void>; enabled: boolean
}) {
  const [query,setQuery]=useState(initialQuery);const [campaign,setCampaign]=useState(campaignId)
  const [busy,setBusy]=useState('');const [error,setError]=useState('');const [notice,setNotice]=useState('');const [selected,setSelected]=useState('')
  const [reviewed,setReviewed]=useState(false);const polling=useRef(false)
  const runs=[...data.research_runs].sort((a,b) => str(b,'created_at').localeCompare(str(a,'created_at')))
  const run=runs.find(row => row.id===selected) || runs[0]
  const activeIds=runs.filter(row => row.status==='Running').map(row => row.id).join(',')
  useEffect(() => {
    if (!activeIds) return
    let stopped=false
    const interval=setInterval(async () => {
      if (polling.current) return
      polling.current=true
      try {
        await Promise.all(activeIds.split(',').map(id => apiAction(`/research/${id}/refresh`)))
        if (!stopped) await onSaved()
      } catch(error) {if(!stopped)setError(message(error))} finally {polling.current=false}
    },7000)
    return () => {stopped=true;clearInterval(interval)}
  },[activeIds,onSaved])
  async function start(event:FormEvent) {
    event.preventDefault();setBusy('start');setError('');setNotice('')
    try {const result=await apiAction('/research',{workspace_id:workspace,campaign_id:campaign || null,query});setSelected(String(result.id));setReviewed(false);await onSaved()}
    catch(error){setError(message(error))}finally{setBusy('')}
  }
  async function action(path:string) {
    if(!run)return;setBusy(path);setError('');setNotice('')
    try {const result=await apiAction(`/research/${run.id}/${path}`);if(path==='import')setNotice(`${result.imported} companies imported. Existing website domains were skipped. Findings remain unverified until you check their sources.`);await onSaved()}
    catch(error){setError(message(error))}finally{setBusy('')}
  }
  const result=(run?.result || {}) as ResearchResult
  return <><section className="panel research-launch"><div className="research-heading"><div className="research-icon"><Bot size={25}/></div><div><h2>Find companies. Keep the evidence.</h2><p>Search public sources, review the findings, then import qualified prospects.</p></div></div>
    <div className="workflow-steps">{['Discovery','Company analysis','Hiring evidence','Contact evidence','Service fit','Qualification','Factual review'].map((name,index) => <span key={name}><small>{index+1}</small>{name}</span>)}</div>
    {!enabled && <div className="notice">AI research needs an OpenAI API key. Add OPENAI_API_KEY in Vercel Production, then redeploy. CRM and manual evidence entry work independently.</div>}
    <form onSubmit={start}><label htmlFor="research-query">What companies are you looking for?<textarea id="research-query" required minLength={10} maxLength={2000} rows={4} value={query} onChange={e => setQuery(e.target.value)} placeholder="Example: Find German ecommerce companies with public customer-support hiring signals that may fit a 10â€“20 agent English/German support team. Include dated source evidence."/></label>
    <div className="research-controls"><label htmlFor="research-campaign">Link findings to campaign<select id="research-campaign" value={campaign} onChange={e => setCampaign(e.target.value)}><option value="">No campaign</option>{data.campaigns.map(row => <option value={row.id} key={row.id}>{str(row,'name')}</option>)}</select></label><button disabled={Boolean(busy) || !enabled} className="primary-button"><Search size={16}/>{busy==='start' ? 'Starting researchâ€¦' : 'Start web research'}</button></div></form><p className="help-text">Each run uses your OpenAI credits. Jobs are saved and can be refreshed after closing this page. Public sources only; no automatic messages are sent.</p>
  </section>{error && <div role="alert" className="error-banner">{error}</div>}{notice && <div role="status" className="notice">{notice}</div>}
    <div className="research-results"><section className="panel run-list"><div className="panel-heading"><h2>Research history</h2><span className="count-badge">{runs.length}</span></div>{runs.map(row => <button className={run?.id===row.id ? 'selected' : ''} onClick={() => {setSelected(row.id);setReviewed(false);setNotice('')}} key={row.id}><span className="pill">{str(row,'status')}</span><strong>{str(row,'query')}</strong><small>{new Date(str(row,'created_at')).toLocaleString('en-GB')}</small></button>)}{!runs.length && <div className="inline-empty">Your research runs will appear here.</div>}</section>
    <section className="panel findings-panel">{!run ? <div className="empty-state"><Search size={34}/><h3>Start with a focused question</h3><p>Research results include source links and require review before importing.</p></div> : <><div className="panel-heading"><h2>Findings</h2><span className="pill">{str(run,'status')}</span></div>
      <div className="finding-actions">{run.status==='Running' && <><button className="secondary-button" disabled={Boolean(busy)} onClick={() => action('refresh')}><RefreshCw size={14}/>Refresh progress</button><button className="secondary-button" disabled={Boolean(busy)} onClick={() => action('cancel')}><Square size={14}/>Cancel run</button></>}
        {run.status==='Failed' && <button className="secondary-button" disabled={Boolean(busy)} onClick={() => action('refresh')}><RefreshCw size={14}/>Check provider status</button>}
        {run.status==='Completed' && <span className="small-text muted">{Number(run.imported_count || 0)} imported</span>}</div>
      {run.status==='Running' && <div className="inline-empty"><RefreshCw className="spin" size={22}/><p>Searching and checking public sources. This can take a few minutes.</p></div>}
      {run.status==='Starting' && <div className="notice">This run is starting. Refresh the workspace if it does not update. If interrupted before a provider response was saved, start a new run.</div>}
      {run.error ? <div className="error-banner">{str(run,'error')}</div> : null}
      {result.summary && <p className="research-summary">{result.summary}</p>}
      {result.companies?.map((candidate,index) => <article className="finding-card" key={`${candidate.website}-${index}`}><div><h3>{candidate.name}</h3><span className="pill warning">Needs review</span></div><p>{candidate.description}</p><a href={safeUrl(candidate.website)} rel="noreferrer" target="_blank">{candidate.website}<ArrowRight size={13}/></a><small>{candidate.country}</small><ul>{candidate.evidence.map((item,i) => <li key={i}><span className="pill">{item.kind}</span><strong>{item.title}</strong><p>{item.excerpt}</p><a href={safeUrl(item.source_url)} rel="noreferrer" target="_blank">Review source <ArrowRight size={12}/></a></li>)}</ul></article>)}
      {run.status==='Completed' && !result.companies?.length && <div className="inline-empty">No candidates passed source validation. Try a more specific query. No invented records were added.</div>}
      {run.status==='Completed' && Boolean(result.companies?.length) && !run.imported_at && <div className="import-findings"><label className="checkbox-label"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)}/><span>I reviewed these prospects and want to add them to the CRM.</span></label><button className="primary-button" disabled={!reviewed || Boolean(busy)} onClick={() => action('import')}><Download size={15}/>{busy==='import' ? 'Importingâ€¦' : 'Import reviewed prospects'}</button></div>}
      {Boolean(run.imported_count) && <div className="notice"><Check size={15}/>Imported. Review each finding in Evidence before awarding scoring points.</div>}
    </>}</section></div></>
}

