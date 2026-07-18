import { AlertTriangle, ArrowLeft, Check, Download, LockKeyhole, RotateCcw, Save, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { defaultTelephoneStory, loadStoryDefinition } from '../game/callEngine'
import { clearAdminUnlock } from '../game/adminAuth'
import { clearStoryOverride, saveStoryDefinitionFallback, saveStoryDefinitionToLocalApi } from '../game/storyPersistence'
import { validateStoryDefinition } from '../game/storyValidation'
import type { TelephoneStory } from '../game/types'
import '../styles/admin.css'
import { GraphEditor } from './GraphEditor'

export function AdminPanel() {
  const [story, setStory] = useState<TelephoneStory>(loadStoryDefinition)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'fallback' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const issues = useMemo(() => validateStoryDefinition(story), [story])
  const errors = issues.filter((issue) => issue.level === 'error')

  async function save() {
    if (errors.length) return
    setSaveState('saving')
    const wroteSource = await saveStoryDefinitionToLocalApi(story)
    saveStoryDefinitionFallback(story)
    setSaveState(wroteSource ? 'saved' : 'fallback')
    window.setTimeout(() => setSaveState('idle'), 2600)
  }

  function exportStory() {
    const blob = new Blob([`${JSON.stringify(story, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'telephone.rules.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importStory(file?: File) {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as TelephoneStory
      const importedIssues = validateStoryDefinition(parsed)
      if (importedIssues.some((issue) => issue.level === 'error')) throw new Error('导入文件包含结构错误，请先修复。')
      setStory(parsed)
      setSaveState('idle')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '无法读取剧情文件。')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function reset() {
    if (!window.confirm('恢复源码内置剧情？当前未保存编辑会丢失。')) return
    clearStoryOverride()
    setStory(defaultTelephoneStory())
  }

  function lockPanel() {
    clearAdminUnlock()
    window.location.assign('/admin')
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <a className="admin-back" href="/" data-app-route><ArrowLeft size={16} />返回电话亭</a>
        <div className="admin-brand"><span>INTERACTIVE NARRATIVE SWITCHBOARD</span><h1>Telephone 剧情交换台</h1></div>
        <div className={`validation-summary ${errors.length ? 'invalid' : ''}`}>
          {errors.length ? <AlertTriangle size={14} /> : <Check size={14} />}
          {errors.length ? `${errors.length} 项错误 · ${issues.length - errors.length} 项提醒` : `结构有效 · ${issues.length} 项提醒`}
        </div>
        <nav>
          <button type="button" onClick={() => fileRef.current?.click()}><Upload size={15} />导入</button>
          <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => importStory(event.target.files?.[0])} />
          <button type="button" onClick={exportStory}><Download size={15} />导出</button>
          <button type="button" onClick={reset}><RotateCcw size={15} />恢复源码</button>
          <button type="button" onClick={lockPanel}><LockKeyhole size={15} />锁定后台</button>
          <button className="save-button" type="button" disabled={saveState === 'saving' || errors.length > 0} onClick={save}><Save size={15} />{saveState === 'saving' ? '保存中' : saveState === 'saved' ? '已写入源码' : saveState === 'fallback' ? '已保存到浏览器' : '保存剧情'}</button>
        </nav>
      </header>
      {issues.length > 0 && <details className="validation-drawer"><summary>查看结构检查结果</summary><ul>{issues.map((issue) => <li key={`${issue.path}-${issue.message}`} className={issue.level}><code>{issue.path}</code><span>{issue.message}</span></li>)}</ul></details>}
      <GraphEditor story={story} onChange={setStory} />
    </main>
  )
}
