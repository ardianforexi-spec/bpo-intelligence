import type { Entity } from './supabase'

export const countries = ['United States','Canada','United Kingdom','Australia','Germany','Austria','Switzerland','Kosovo','Other']
export const services = ['Customer Support','Sales & Appointment Setting','Data Entry & Processing','Data Analytics','Technical Support','Back Office Operations','Virtual Assistants']
export const stages = ['Discovered','Researching','Qualified','Contact identified','Draft prepared','Contacted','Replied','Meeting scheduled','Negotiation','Won','Lost']
export const kinds = ['Hiring','Company size','Growth','Potential demand','Decision maker','Verified contact','Recent activity','Other']
export const weights: Record<string, number> = { Hiring:25, 'Company size':15, Growth:15, 'Potential demand':20, 'Decision maker':10, 'Verified contact':10, 'Recent activity':5 }
export type Field = { key: string; label: string; type?: 'text' | 'email' | 'url' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'services'; options?: string[]; entity?: 'companies' | 'contacts' | 'campaigns'; required?: boolean; max?: number; hint?: string }
export type Module = { entity: Entity; label: string; singular: string; description: string; columns: string[]; fields: Field[] }
const company: Field = { key:'company_id', label:'Company', type:'select', entity:'companies', required:true }
const campaign: Field = { key:'campaign_id', label:'Campaign', type:'select', entity:'campaigns' }

export const modules: Record<string, Module> = {
  Companies: { entity:'companies',label:'Companies',singular:'company',description:'Real prospects, company profiles and service opportunities.', columns:['name','country','industry','score','status'],fields:[
    {key:'name',label:'Company name',required:true,max:200},{key:'website',label:'Website',type:'url'},
    {key:'country',label:'Country',type:'select',options:countries},{key:'industry',label:'Industry'},
    {key:'employees',label:'Employees (leave blank if unknown)',type:'number'},
    {key:'status',label:'Research status',type:'select',options:['New','Researching','Qualified','Needs review','Archived']},
    {key:'services',label:'Potential service fit',type:'services'}, {key:'description',label:'Company notes',type:'textarea',max:10000},
  ]},
  Contacts: { entity:'contacts',label:'Contacts',singular:'contact',description:'Professional contacts with source links and verification status.',columns:['name','company_id','title','email','verification'],fields:[
    company,{key:'name',label:'Full name',required:true,max:200},{key:'title',label:'Job title'},
    {key:'email',label:'Business email',type:'email'},{key:'phone',label:'Business phone'},
    {key:'linkedin_url',label:'Professional profile URL',type:'url'}, {key:'source_url',label:'Public source URL',type:'url'},
    {key:'verification',label:'Email verification',type:'select',options:['Unverified','Verified','Bounced'],hint:'Verified means you have independently checked the business contact and source.'},
    {key:'notes',label:'Notes',type:'textarea'},
  ]},
  Leads: { entity:'leads',label:'Leads',singular:'lead',description:'Qualify opportunities and keep the next step clear.',columns:['company_id','stage','score','value','next_action','due_date'],fields:[
    company,campaign,{key:'stage',label:'Pipeline stage',type:'select',options:stages},
    {key:'value',label:'Estimated deal value',type:'number'}, {key:'currency',label:'Currency',type:'select',options:['EUR','USD','GBP','CAD','AUD','CHF']},
    {key:'owner_name',label:'Assigned teammate'}, {key:'next_action',label:'Next action'}, {key:'due_date',label:'Follow-up date',type:'date'}, {key:'notes',label:'Notes',type:'textarea'},
  ]},
  Campaigns: { entity:'campaigns',label:'Campaigns',singular:'campaign',description:'Define your market, service and research criteria.',columns:['name','country','service','language','status'],fields:[
    {key:'name',label:'Campaign name',required:true}, {key:'country',label:'Target market',type:'select',options:countries}, {key:'industry',label:'Target industry'},
    {key:'service',label:'Service',type:'select',options:services},{key:'language',label:'Language',type:'select',options:['English','German']},
    {key:'status',label:'Status',type:'select',options:['Draft','Active','Paused','Completed']},
    {key:'query',label:'Research criteria',type:'textarea',hint:'Describe the company size, region, public signals and services you want to investigate.'},
  ]},
  Evidence: { entity:'evidence',label:'Evidence & hiring',singular:'evidence',description:'Keep a source and date for every finding. Verify findings before they contribute to scoring.',columns:['company_id','kind','title','verified','occurred_on'],fields:[
    company,{key:'kind',label:'Evidence category',type:'select',options:kinds,required:true},{key:'title',label:'Finding',required:true,max:300},
    {key:'source_url',label:'Source URL',type:'url',required:true},{key:'excerpt',label:'Supporting excerpt / notes',type:'textarea',required:true},
    {key:'occurred_on',label:'Date of the event (if known)',type:'date'}, {key:'verified',label:'I checked this source and confirmed the finding',type:'checkbox'},
  ]},
  Outreach: { entity:'outreach',label:'Outreach drafts',singular:'draft',description:'Write and review English or German drafts. Nothing is sent automatically.',columns:['subject','company_id','contact_id','language','status'],fields:[
    company,{key:'contact_id',label:'Professional contact',type:'select',entity:'contacts'},campaign,
    {key:'language',label:'Language',type:'select',options:['English','German']},
    {key:'subject',label:'Subject',required:true,max:300}, {key:'body',label:'Message draft',type:'textarea',required:true,max:20000},
    {key:'status',label:'Review status',type:'select',options:['Draft','Approved','Rejected'],hint:'Approval requires a verified contact who is not suppressed. Sending is outside this app.'},
  ]},
  Suppression: { entity:'suppression',label:'Do not contact',singular:'suppression',description:'Suppressed business emails are blocked from new or approved outreach drafts.',columns:['email','reason','created_at'],fields:[
    {key:'email',label:'Email to suppress',type:'email',required:true},{key:'reason',label:'Reason',required:true},
  ]},
}

export const fieldLabel = (key: string) => ({ company_id:'Company',contact_id:'Contact',campaign_id:'Campaign',due_date:'Follow-up',occurred_on:'Event date',created_at:'Created',next_action:'Next action' }[key] || key.replaceAll('_',' ').replace(/^./, c => c.toUpperCase()))

