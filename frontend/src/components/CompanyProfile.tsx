import { useEffect, useRef } from 'react'
import { ArrowRight, FileText, Pencil, Plus, ShieldCheck, Users, X } from 'lucide-react'
import { weights } from '../lib/modules'
import { str, type Row, type Snapshot } from '../lib/supabase'
import { companyScore, dateLabel, safeUrl, Score } from './DataPanels'

export function CompanyProfile({ company, data, onClose, onEdit, onAddContact, onAddEvidence, onDraft }: {
  company: Row; data: Snapshot; onClose: () => void; onEdit: () => void; onAddContact: () => void; onAddEvidence: () => void; onDraft: () => void
}) {
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close()},[])
  const evidence=data.evidence.filter(row=>row.company_id===company.id)
  const contacts=data.contacts.filter(row=>row.company_id===company.id)
  const scores=data.scores.find(row=>row.company_id===company.id)?.components as Record<string,number>|undefined
  return <dialog ref={dialog} className="record-dialog profile-dialog" aria-labelledby="company-title" onCancel={e=>{e.preventDefault();onClose()}}><div className="dialog-header"><div><span className="eyebrow">COMPANY PROFILE</span><h2 id="company-title">{str(company,'name')}</h2></div><button className="icon-button" aria-label="Close profile" onClick={onClose}><X size={20}/></button></div>
    <div className="profile-meta"><span>{str(company,'country')||'Country unknown'}</span><span>{str(company,'industry')||'Industry unknown'}</span><span>{company.employees==null?'Company size unknown':`${company.employees} employees`}</span><span className="pill">{str(company,'status')}</span></div>
    {safeUrl(str(company,'website'))&&<a className="profile-link" href={str(company,'website')} target="_blank" rel="noreferrer">{str(company,'website')}<ArrowRight size={14}/></a>}
    <p className="profile-description">{str(company,'description')||'No company notes yet.'}</p><div className="profile-actions"><button className="secondary-button" onClick={onEdit}><Pencil size={14}/>Edit company</button><button className="secondary-button" onClick={onAddContact}><Users size={14}/>Add contact</button><button className="secondary-button" onClick={onAddEvidence}><ShieldCheck size={14}/>Add evidence</button><button className="primary-button" onClick={onDraft}><FileText size={14}/>Create draft</button></div>
    <section className="profile-section"><div className="section-heading"><h2>Evidence coverage</h2><Score score={companyScore(data,company.id)}/></div><p className="help-text">Each verified category counts once. This score measures supporting evidence; it does not predict outsourcing intent.</p><div className="score-components">{Object.entries(weights).map(([kind,max])=><div key={kind}><span>{kind}</span><strong>{scores?.[kind]||0} / {max}</strong></div>)}</div></section>
    <section className="profile-section"><div className="section-heading"><h2>Findings & sources</h2><span className="count-badge">{evidence.length}</span></div>{evidence.map(row=><article className="profile-evidence" key={row.id}><div><span className="pill">{str(row,'kind')}</span><span className={`pill ${row.verified?'good':'warning'}`}>{row.verified?'Verified':'Needs review'}</span></div><h3>{str(row,'title')}</h3><p>{str(row,'excerpt')}</p><a href={safeUrl(str(row,'source_url'))} target="_blank" rel="noreferrer">Review source<ArrowRight size={13}/></a><small>Acquired {dateLabel(str(row,'acquired_at'))}{row.occurred_on?` Â· Event ${dateLabel(str(row,'occurred_on'))}`:''}</small></article>)}{!evidence.length&&<div className="inline-empty">No findings yet. Add source-backed evidence before qualification.</div>}</section>
    <section className="profile-section"><div className="section-heading"><h2>Professional contacts</h2><button className="text-button" onClick={onAddContact}><Plus size={14}/>Add</button></div>{contacts.map(row=><div className="profile-contact" key={row.id}><span><strong>{str(row,'name')}</strong><small>{str(row,'title')||'Role unknown'} Â· {str(row,'email')||'Email unknown'}</small></span><span className="pill">{str(row,'verification')}</span>{data.suppression.some(s=>str(s,'email')===str(row,'email').toLowerCase())&&<span className="pill danger">Suppressed</span>}</div>)}{!contacts.length&&<div className="inline-empty">No professional contacts saved.</div>}</section>
  </dialog>
}

