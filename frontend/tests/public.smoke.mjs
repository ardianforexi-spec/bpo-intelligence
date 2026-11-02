import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1000}})
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
await page.route('**/api/v1/capabilities',route=>route.fulfill({json:{auth:true,research:false}}))
try{
  await page.goto(process.env.BPO_TEST_URL || 'http://127.0.0.1:5174/',{waitUntil:'networkidle'})
  await page.getByRole('heading',{name:'Welcome back'}).waitFor()
  await page.getByRole('button',{name:'New here? Create an account'}).click()
  await page.getByRole('heading',{name:'Create your account'}).waitFor()
  await page.getByRole('button',{name:'Already have an account? Sign in'}).click()
  await page.getByRole('button',{name:'Forgot password?'}).click()
  await page.getByRole('heading',{name:'Reset your password'}).waitFor()
  await page.getByRole('button',{name:'Back to sign in'}).click()
  const csv=await page.evaluate(async()=>{
    const {parseCsv,csvCell}=await import('/src/lib/supabase.ts')
    return {rows:parseCsv('\uFEFFname,description\r\n"Example, Inc.","line one\nline two"\r\n'),formula:csvCell('=SUM(A1:A2)')}
  })
  assert.deepEqual(csv.rows,[{name:'Example, Inc.',description:'line one\nline two'}])
  assert.equal(csv.formula,'"\'=SUM(A1:A2)"')
  await mkdir('../qa-artifacts',{recursive:true})
  await page.screenshot({path:'../qa-artifacts/login-desktop.png',fullPage:true})
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:'../qa-artifacts/login-mobile.png',fullPage:true})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true)
  assert.deepEqual(errors,[])
  console.log('PASS: sign-in, signup and reset screens; quoted CSV parsing, spreadsheet formula protection; desktop/mobile layout; no browser exceptions. No signup email sent.')
}finally{await browser.close()}

