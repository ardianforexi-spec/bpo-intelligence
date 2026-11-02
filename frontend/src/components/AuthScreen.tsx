import { useState, type FormEvent } from 'react'
import { ArrowRight, Layers3, ShieldCheck } from 'lucide-react'
import { authConfigured, message, supabase } from '../lib/supabase'

export function AuthScreen({ recovery = false, onRecovered }: { recovery?: boolean; onRecovered?: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>( 'login')
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password }); if (error) throw error
        setNotice('Password updated.'); onRecovered?.()
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        if (!data.session) setNotice('Check your email to confirm your account. After confirmation, return here and sign in.')
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (error) throw error
        setNotice('If this account exists, a password reset email is on its way.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error
      }
    } catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <div className="auth-shell">
    <section className="auth-story"><div className="brand"><span className="brand-mark"><Layers3 /></span><span>BPO<span className="brand-subtitle">INTELLIGENCE</span></span></div>
      <span className="eyebrow">YOUR NEXT OPPORTUNITY STARTS HERE</span><h1>Research with evidence.<br />Build better relationships.</h1>
      <p>One workspace for your prospects, research, team and sales pipeline.</p><div className="auth-trust"><ShieldCheck size={20} /> Your workspace data stays with your team.</div>
    </section><section className="auth-form"><div className="eyebrow">BPO INTELLIGENCE</div>
      <h2>{recovery ? 'Choose a new password' : mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</h2>
      <p>{mode === 'signup' ? 'Create an account, then start or join a workspace.' : 'Sign in to continue to your workspace.'}</p>
      {!authConfigured ? <div className="error-banner">Authentication is not configured. Set the public Supabase URL and publishable key.</div> : <form onSubmit={submit}>
        {!recovery && <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></label>}
        {(recovery || mode !== 'reset') && <label>Password<input type="password" autoComplete={recovery || mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} /></label>}
        {error && <div role="alert" className="error-banner">{error}</div>}{notice && <div role="status" className="notice">{notice}</div>}
        <button className="primary-button" disabled={busy}>{busy ? 'Please waitâ€¦' : recovery ? 'Save password' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Sign in'}<ArrowRight size={16} /></button>
      </form>}
      {!recovery && <div className="auth-links"><button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setNotice('') }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
        <button onClick={() => { setMode(mode === 'reset' ? 'login' : 'reset'); setError(''); setNotice('') }}>{mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</button></div>}
    </section></div>
}

