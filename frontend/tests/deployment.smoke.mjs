import {chromium} from 'playwright'
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const page=await browser.newPage({viewport:{width:1366,height:900}})
const errors=[];page.on('pageerror',error=>errors.push(error.message))
try{
  await page.goto('https://bpo-intelligence.vercel.app/',{waitUntil:'networkidle'})
  await page.getByRole('heading',{name:'Welcome back'}).waitFor()
  await page.getByLabel('Email address').waitFor()
  await page.getByRole('button',{name:'Sign in',exact:true}).waitFor()
  await page.screenshot({path:'../qa-artifacts/production-login.png',fullPage:true})
  if(errors.length)throw new Error(errors.join('; '))
  console.log('PASS: deployed production sign-in renders with Supabase configuration; no browser exceptions; no login credentials or email sent.')
}finally{await browser.close()}

