import { ArrowLeft, PhoneCall, RotateCcw, Settings2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { formatPhoneNumber } from '../game/dialModel'
import { clearProgress, loadLastRecord, loadProgress, loadRecordArchive } from '../game/record'
import { loadStoryDefinition } from '../game/callEngine'
import '../styles/record.css'

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(timestamp))
}

export function CallRecord() {
  const story = loadStoryDefinition()
  const [record, setRecord] = useState(loadLastRecord)
  const [archive, setArchive] = useState(loadRecordArchive)
  const [progress, setProgress] = useState(loadProgress)

  function clearAll() {
    if (!window.confirm('清除所有通话档案、已发现号码与多周目结局？此操作无法撤销。')) return
    clearProgress()
    setRecord(null)
    setArchive([])
    setProgress(loadProgress())
  }

  const endingTypes = Object.entries(story.extensions.telephone.endings)

  return (
    <main className="record-page">
      <header className="record-topbar">
        <a href="/" data-app-route><ArrowLeft size={16} />返回电话亭</a>
        <div><span>MERIDIAN CALL ARCHIVE</span><strong>夜间线路档案室</strong></div>
        <nav><a href="/admin" data-app-route><Settings2 size={15} />剧情后台</a><button type="button" onClick={clearAll}><Trash2 size={15} />清除档案</button></nav>
      </header>

      <section className="record-overview">
        <article><span>ATTEMPTS</span><strong>{String(progress.attempts).padStart(2, '0')}</strong><small>已完成夜班</small></article>
        <article><span>ENDINGS</span><strong>{progress.seenEndings.length}/{endingTypes.length}</strong><small>已归档结局</small></article>
        <article><span>NUMBERS</span><strong>{progress.discoveredNumbers.length}/{story.globals.phone.directory.length}</strong><small>已发现线路</small></article>
        <article><span>CLUES</span><strong>{progress.clues.length}</strong><small>保留的异常记录</small></article>
      </section>

      {!record ? (
        <section className="record-empty">
          <PhoneCall size={34} /><h1>尚无终止通话</h1><p>完成任意结局后，交换机会在这里留下线路记录。</p><a href="/" data-app-route>进入电话亭</a>
        </section>
      ) : (
        <div className="record-layout">
          <section className="call-sheet">
            <header>
              <div><span>GENERAL POST OFFICE</span><strong>MONITORED CALL TRANSCRIPT</strong></div>
              <dl><div><dt>FILE</dt><dd>{record.sessionId}</dd></div><div><dt>OPENED</dt><dd>{formatDate(record.startedAt)}</dd></div><div><dt>CLOSED</dt><dd>{formatDate(record.completedAt)}</dd></div></dl>
            </header>
            <div className={`record-ending-mark ending-${record.ending}`}><span>OUTCOME</span><strong>{record.endingTitle}</strong></div>
            <div className="transcript-paper">
              {record.transcript.map((entry, index) => (
                <article key={entry.id} className={`record-line speaker-${entry.speaker}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><header><strong>{entry.speakerLabel}</strong><time>{new Date(entry.createdAt).toLocaleTimeString('zh-CN', { hour12: false })}</time></header><p>{entry.text}</p></div>
                </article>
              ))}
            </div>
            <footer><span>END OF MONITORED MATERIAL</span><strong>MERIDIAN COURTESY EXCHANGE · INTERNAL USE</strong></footer>
          </section>

          <aside className="record-sidebar">
            <section>
              <span className="record-section-label">DIALED NUMBERS</span><h2>本次拨号</h2>
              <div className="dial-log-list">
                {record.dialLog.length ? record.dialLog.map((item) => <article key={`${item.number}-${item.createdAt}`}><strong>{formatPhoneNumber(item.canonicalNumber ?? item.number)}</strong><span>{item.label}{item.canonicalNumber && item.canonicalNumber !== item.number ? ` · 拨入 ${formatPhoneNumber(item.number)}` : ''}</span><i className={item.connected ? 'connected' : ''}>{item.connected ? '接通' : '未接通'}</i></article>) : <p>本次没有主动拨号。</p>}
              </div>
            </section>
            <section>
              <span className="record-section-label">RETAINED CLUES</span><h2>跨夜记录</h2>
              <ol>{record.clues.map((clue) => <li key={clue}>{clue}</li>)}</ol>
            </section>
            <section>
              <span className="record-section-label">ENDING INDEX</span><h2>结局索引</h2>
              <div className="ending-index">
                {endingTypes.map(([type, ending]) => {
                  const found = progress.seenEndings.includes(type as typeof progress.seenEndings[number])
                  return <article key={type} className={found ? 'found' : 'unknown'}><span>{found ? '●' : '○'}</span><div><strong>{found ? ending.title : '未归档'}</strong><small>{found ? ending.subtitle : '信号尚未终止'}</small></div></article>
                })}
              </div>
            </section>
            <a className="record-restart" href="/" data-app-route><RotateCcw size={16} />再次进入电话亭</a>
          </aside>
        </div>
      )}

      {archive.length > 0 && (
        <section className="archive-strip"><header><span>ARCHIVE DRAWER</span><strong>最近 {archive.length} 次通话</strong></header><div>{archive.map((item) => <article key={item.sessionId}><span>{item.sessionId}</span><strong>{item.endingTitle}</strong><small>{formatDate(item.completedAt)}</small></article>)}</div></section>
      )}
    </main>
  )
}
