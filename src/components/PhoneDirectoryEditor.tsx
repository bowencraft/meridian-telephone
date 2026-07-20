import { ArrowLeft, ContactRound, Link2, Plus, Trash2 } from 'lucide-react'
import type { PhoneDirectoryEntry, TelephoneStory } from '../game/types'
import { CollapsibleAdminSection } from './CollapsibleAdminSection'

interface PhoneDirectoryEditorProps {
  story: TelephoneStory
  onChange: (story: TelephoneStory) => void
  onExit: () => void
}

function uniqueId(prefix: string, existing: string[]) {
  let index = existing.length + 1
  while (existing.includes(`${prefix}_${index}`)) index += 1
  return `${prefix}_${index}`
}

function aliasLines(value: string) {
  return value.split(/[,，\n]/).map((alias) => alias.replace(/\D/g, '')).filter(Boolean)
}

export function PhoneDirectoryEditor({ story, onChange, onExit }: PhoneDirectoryEditorProps) {
  const directory = story.globals.phone.directory
  const scene = story.extensions.telephone.scene

  function setDirectory(next: PhoneDirectoryEntry[]) {
    onChange({ ...story, globals: { ...story.globals, phone: { ...story.globals.phone, directory: next } } })
  }

  function updateNumber(index: number, patch: Partial<PhoneDirectoryEntry>) {
    setDirectory(directory.map((number, itemIndex) => itemIndex === index ? { ...number, ...patch } : number))
  }

  function addNumber() {
    const id = uniqueId('phone', directory.map((number) => number.id))
    setDirectory([...directory, { id, number: '0000000', label: '新号码', description: '', category: 'strange' }])
  }

  return (
    <section className="phone-directory-workspace">
      <header className="directory-workspace-header">
        <button type="button" onClick={onExit}><ArrowLeft size={15} />返回剧情图</button>
        <div><span>PHONE DIRECTORY / INDEPENDENT DATA</span><h2>电话簿与物品引用</h2><p>号码只在这里维护；墙面广告、柜台遗留物都通过稳定 ID 引用同一条线路。</p></div>
        <strong><ContactRound size={16} />{directory.length} 条线路</strong>
        <button className="directory-add" type="button" onClick={addNumber}><Plus size={14} />新增电话</button>
      </header>

      <div className="directory-workspace-scroll">
        <div className="directory-card-grid">
          {directory.map((number, index) => {
            const references = scene.props.filter((prop) => prop.phoneRefs?.includes(number.id)).map((prop) => ({
              prop,
              slots: scene.slots.filter((slot) => slot.candidates.some((candidate) => candidate.propId === prop.id)),
            }))
            return (
              <article className="directory-card" key={number.id}>
                <header>
                  <div><span>{number.category ?? 'strange'}</span><h3>{number.label}</h3><code>{number.number}</code></div>
                  <div className="directory-count"><Link2 size={13} /><strong>{references.length}</strong><small>件物品引用</small></div>
                </header>
                <CollapsibleAdminSection title="线路资料">
                  <div className="two-fields"><label><span>稳定 ID</span><input value={number.id} disabled /></label><label><span>号码</span><input value={number.number} onChange={(event) => updateNumber(index, { number: event.target.value.replace(/\D/g, '') })} /></label></div>
                  <label><span>号码 aliases（每行一个，仍归入同一联系人）</span><textarea rows={2} value={(number.aliases ?? []).join('\n')} onChange={(event) => updateNumber(index, { aliases: aliasLines(event.target.value) })} /></label>
                  <div className="two-fields"><label><span>名称</span><input value={number.label} onChange={(event) => updateNumber(index, { label: event.target.value })} /></label><label><span>分类</span><select value={number.category ?? 'strange'} onChange={(event) => updateNumber(index, { category: event.target.value as PhoneDirectoryEntry['category'] })}><option>public</option><option>meridian</option><option>internal</option><option>emergency</option><option>strange</option></select></label></div>
                  <label><span>说明</span><textarea rows={3} value={number.description} onChange={(event) => updateNumber(index, { description: event.target.value })} /></label>
                  <label className="checkbox-line"><input type="checkbox" checked={number.initiallyKnown ?? false} onChange={(event) => updateNumber(index, { initiallyKnown: event.target.checked })} /><span>新夜班开始时已经记录在玩家号码簿</span></label>
                </CollapsibleAdminSection>
                <CollapsibleAdminSection title={`引用来源 · ${references.length} 件物品`}>
                  {references.length ? <div className="directory-reference-list">{references.map(({ prop, slots }) => <div key={prop.id}><strong>{prop.label}</strong><code>{prop.id}</code><span>{slots.length ? slots.map((slot) => `${slot.label}（${slot.layer === 'counter' ? '柜台' : '墙面'}）`).join('、') : '尚未放入任何点位'}</span></div>)}</div> : <p className="directory-empty-ref">目前没有物品引用这条线路；它仍可被剧情边直接拨通。</p>}
                </CollapsibleAdminSection>
                <button type="button" className="inline-delete" onClick={() => setDirectory(directory.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={13} />删除线路</button>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
