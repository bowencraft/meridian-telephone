import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { loginAdmin, type AdminLoginResult, type AdminSessionState } from '../game/adminAuth'
import '../styles/admin-gate.css'

interface AdminGateProps {
  session: AdminSessionState
  onUnlock: () => void
}

type GateStatus = 'idle' | 'checking' | Exclude<AdminLoginResult, 'ok'>

const STATUS_COPY: Record<Exclude<GateStatus, 'idle' | 'checking'>, string> = {
  invalid: '密钥不正确，交换台拒绝接入。',
  'rate-limited': '失败次数过多，请稍后再试。',
  unconfigured: '服务器尚未配置值班密钥。',
  insecure: '后台只允许通过 HTTPS 接入。',
  unavailable: '无法连接后台验证服务，请检查服务器状态。',
}

export function AdminGate({ session, onUnlock }: AdminGateProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<GateStatus>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const canSubmit = session.available && session.configured && session.loginAllowed

  useEffect(() => {
    if (canSubmit) inputRef.current?.focus()
  }, [canSubmit])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || status === 'checking') return
    setStatus('checking')
    const result = await loginAdmin(password)
    if (result === 'ok') {
      onUnlock()
      return
    }
    setStatus(result)
    if (result === 'invalid') setPassword('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const unavailableCopy = !session.available
    ? ['验证服务不可用', '当前页面没有取得服务器会话状态；前端不会执行离线密码验证。']
    : !session.loginAllowed
      ? ['需要安全连接', '请通过 HTTPS 打开后台。当前连接不会发送值班密钥。']
      : ['值班密钥尚未配置', '请在服务器 .env 中设置 ADMIN_PASSWORD，然后重新启动服务。']

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
          <p>这条线路不对公众开放。值班密钥会发送至服务器核验，不会写入浏览器存储。</p>
        </div>

        {canSubmit ? (
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
              {status === 'idle' ? '认证由服务器完成，仅在当前 HttpOnly 会话内有效。' : status === 'checking' ? '正在核验线路…' : STATUS_COPY[status]}
            </div>
            <button className="admin-gate-submit" type="submit" disabled={!password || status === 'checking'}>
              <ShieldCheck size={16} />{status === 'checking' ? '正在核验线路…' : '接入交换台'}
            </button>
          </form>
        ) : (
          <div className="admin-gate-unconfigured" role="status">
            <LockKeyhole size={18} />
            <div><strong>{unavailableCopy[0]}</strong><p>{unavailableCopy[1]}</p></div>
          </div>
        )}

        <footer><span>GPO / MCE–07</span><span>SERVER SESSION CONTROL</span></footer>
      </section>
    </main>
  )
}
