import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { adminPasswordConfigured, rememberAdminUnlock, verifyAdminPassword } from '../game/adminAuth'
import '../styles/admin-gate.css'

interface AdminGateProps {
  onUnlock: () => void
}

export function AdminGate({ onUnlock }: AdminGateProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<'idle' | 'checking' | 'invalid'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const configured = adminPasswordConfigured()

  useEffect(() => inputRef.current?.focus(), [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!configured || status === 'checking') return
    setStatus('checking')
    const accepted = await verifyAdminPassword(password)
    if (accepted) {
      rememberAdminUnlock()
      onUnlock()
      return
    }
    setStatus('invalid')
    setPassword('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <main className="admin-gate-shell">
      <div className="admin-gate-rain" aria-hidden="true"><i /><i /><i /><i /></div>
      <a className="admin-gate-back" href="/" data-app-route><ArrowLeft size={15} />返回电话亭</a>

      <section className={`admin-gate-card ${status === 'invalid' ? 'is-invalid' : ''}`} aria-labelledby="admin-gate-title">
        <div className="admin-gate-hardware" aria-hidden="true">
          <span className="admin-gate-screw screw-a" /><span className="admin-gate-screw screw-b" />
          <span className="admin-gate-screw screw-c" /><span className="admin-gate-screw screw-d" />
          <div className="admin-gate-lock"><LockKeyhole size={25} strokeWidth={1.35} /></div>
          <span className="admin-gate-lamp" />
        </div>

        <div className="admin-gate-copy">
          <span className="admin-gate-eyebrow">MERIDIAN · AUTHORIZED LINES ONLY</span>
          <h1 id="admin-gate-title">交换台值班室</h1>
          <p>这条线路不对公众开放。请输入本夜值班密钥，方可接入剧情交换台。</p>
        </div>

        {configured ? (
          <form className="admin-gate-form" onSubmit={submit}>
            <label htmlFor="admin-password"><KeyRound size={14} />值班密钥</label>
            <div className="admin-password-field">
              <input
                ref={inputRef}
                id="admin-password"
                name="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setStatus('idle') }}
                autoComplete="current-password"
                spellCheck={false}
                aria-invalid={status === 'invalid'}
                aria-describedby="admin-gate-status"
                placeholder="••••••••••••"
              />
              <button type="button" aria-label={showPassword ? '隐藏密钥' : '显示密钥'} onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="admin-gate-status" id="admin-gate-status" aria-live="polite">
              {status === 'invalid' ? '密钥不正确，交换台拒绝接入。' : '验证仅在当前浏览器会话内有效。'}
            </div>
            <button className="admin-gate-submit" type="submit" disabled={!password || status === 'checking'}>
              <ShieldCheck size={16} />{status === 'checking' ? '正在核验线路…' : '接入交换台'}
            </button>
          </form>
        ) : (
          <div className="admin-gate-unconfigured" role="status">
            <LockKeyhole size={18} />
            <div><strong>值班密钥尚未配置</strong><p>请在本地 <code>.env</code> 中设置 <code>ADMIN_PASSWORD</code>，然后重新启动服务。</p></div>
          </div>
        )}

        <footer><span>GPO / MCE–07</span><span>LINE ACCESS CONTROL</span></footer>
      </section>
    </main>
  )
}
