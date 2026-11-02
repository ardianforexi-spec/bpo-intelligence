import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

// Browser-only fixtures. Every Supabase call is intercepted; no real auth account or business data is written.
const uid='11111111-1111-4111-8111-111111111111', workspace='22222222-2222-4222-8222-222222222222'
const company='33333333-3333-4333-8333-333333333333'
const session={access_token:`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture`,refresh_token:'browser-fixture-only',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:uid,aud:'authenticated',role:'authenticated',email:'browser-qa@example.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:new Date().toISOString()}}
const db={bpo_workspaces:[{id:workspace,name:'BPO QA Workspace',owner_id:uid,created_at:new Date().toISOString()}],bpo_companies:[{id:company,workspace_id:workspace,name:'QA Example Company',website:'https://qa.example.invalid',domain:'qa.example.invalid',country:'Germany',industry:'Software',employees:30,status:'New',description:'Browser fixture only',created_at:new Date().toISOString()}],bpo_contacts:[],bpo_leads:[],bpo_evidence:[],bpo_campaigns:[],bpo_outreach:[],bpo_suppression:[],bpo_activities:[],bpo_research_runs:[],bpo_members:[],bpo_scores:[]}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[]
page.on('pageerror',error=>errors.push(error.message))
await page.addInitScript(session=>localStorage.setItem('sb-ghqimzognkumxfybnucg-auth-token',JSON.stringify(session)),session)
await page.route('https://ghqimzognkumxfybnucg.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url())
  if(url.pathname.includes('/auth/v1'))return route.fulfill({json:url.pathname.endsWith('/user')?session.user:session})
  const table=url.pathname.split('/').pop();let rows=db[table]||[]
  if(req.method()==='POST'){
    const incoming=req.postDataJSON();const values=Array.isArray(incoming)?incoming:[incoming]
    rows=values.map(value=>({...value,id:crypto.randomUUID(),created_at:new Date().toISOString()}));db[table].push(...rows)
  }else if(req.method()==='PATCH'){
    const id=url.searchParams.get('id')?.replace('eq.','');const row=rows.find(r=>r.id===id);if(row)Object.assign(row,req.postDataJSON());rows=row?[row]:[]
  }else if(req.method()==='DELETE'){
    const id=url.searchParams.get('id')?.replace('eq.','');rows=rows.filter(r=>r.id===id);db[table]=db[table].filter(r=>r.id!==id)
  }
  return route.fulfill({json:rows,headers:{'content-range':`0-${Math.max(rows.length-1,0)}/${rows.length}`}})
})
await page.route('**/api/v1/capabilities',route=>route.fulfill({json:{auth:true,research:false}}))
try{
  await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'})
  await page.getByRole('heading',{name:'Overview',exact:true}).waitFor()
  await page.getByRole('navigation').getByRole('button',{name:'Companies',exact:true}).click()
  await page.getByRole('button',{name:'QA Example Company',exact:true}).click()
  await page.getByRole('dialog').getByRole('heading',{name:'QA Example Company'}).waitFor()
  await page.getByRole('button',{name:'Close profile'}).click()
  await page.getByRole('button',{name:'Add company',exact:true}).click()
  await page.getByLabel('Company name').fill('QA Created Company')
  assert.equal(await page.locator('#field-country').inputValue(),'')
  await page.locator('#field-website').fill('https://created.example.invalid')
  await page.getByRole('button',{name:'Save record'}).click()
  await page.getByRole('button',{name:'QA Created Company',exact:true}).waitFor()
  await page.getByRole('navigation').getByRole('button',{name:'Contacts',exact:true}).click()
  await page.getByRole('button',{name:'Add contact',exact:true}).first().click()
  await page.locator('#field-company_id').selectOption(company)
  await page.getByLabel('Full name').fill('QA Professional Contact')
  await page.getByLabel('Business email').fill('contact@example.invalid')
  await page.getByRole('button',{name:'Save record'}).click()
  await page.getByRole('button',{name:'QA Professional Contact',exact:true}).waitFor()
  for(const name of ['Leads','Evidence & hiring','Campaigns','Pipeline','Outreach drafts','Analytics','Activity','Import','Do not contact','Settings','AI Research','Markets','Overview']){
    await page.getByRole('navigation').getByRole('button',{name,exact:true}).click()
    await page.waitForTimeout(80)
  }
  await mkdir('../qa-artifacts',{recursive:true})
  await page.screenshot({path:'../qa-artifacts/workspace-desktop.png',fullPage:true})
  await page.setViewportSize({width:390,height:844})
  await page.getByRole('button',{name:'Open navigation'}).click()
  await page.getByRole('navigation').getByRole('button',{name:'Companies',exact:true}).click()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true)
  await page.screenshot({path:'../qa-artifacts/workspace-mobile.png',fullPage:true})
  assert.equal(db.bpo_companies.length,2);assert.equal(db.bpo_contacts.length,1);assert.deepEqual(errors,[])
  console.log('PASS: browser-only authenticated fixture; company/contact create forms, unknown country preserved, company profile, every navigation item, desktop/mobile, no page exceptions. All backend calls intercepted; no production records written.')
}finally{await browser.close()}



