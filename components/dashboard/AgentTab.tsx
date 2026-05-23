'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'What is the redemption period in Miami-Dade?',
  'Explain the difference between Live and OCP auctions',
  'How do Florida tax deed auctions work?',
  'Wayne County Michigan bidding process',
]

const WELCOME =
  'Welcome to the DeedVault Agent. I specialize in Florida and Michigan tax deed intelligence. Ask about county rules, redemption periods, auction types, or investment strategy.'

export default function AgentTab() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const history: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
        }),
      })

      if (!res.ok) {
        let errorText = 'Request failed'
        try {
          const data = await res.json()
          if (typeof data.error === 'string') errorText = data.error
        } catch {
          errorText = res.statusText || errorText
        }
        throw new Error(errorText)
      }

      if (!res.body) throw new Error('No response stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        const content = assistantContent
        setMessages(m => {
          const next = [...m]
          next[next.length - 1] = { role: 'assistant', content }
          return next
        })
      }

      if (!assistantContent.trim()) {
        setMessages(m => {
          const next = [...m]
          next[next.length - 1] = {
            role: 'assistant',
            content: 'No response received. Please try again.',
          }
          return next
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setMessages(m => {
        const next = [...m]
        next[next.length - 1] = { role: 'assistant', content: `Error: ${message}` }
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 h-[calc(100dvh-7rem)] max-w-4xl mx-auto px-3 sm:px-6 w-full">
      <div className="py-3 sm:py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>DEEDVAULT AGENT</p>
        <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>Tax deed Q&A · county rules · property analysis</p>
      </div>

      <div className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-3 sm:space-y-4 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[min(100%,20rem)] sm:max-w-[85%] rounded-md px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed whitespace-pre-wrap break-words" style={{
              background: m.role === 'user' ? 'var(--gold-glow)' : 'var(--panel)',
              border: `1px solid ${m.role === 'user' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
              color: 'var(--text)',
            }}>
              {m.role === 'assistant' && <span className="font-mono text-[10px] block mb-1" style={{ color: 'var(--gold)' }}>AGENT</span>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 flex-nowrap -mx-1 px-1">
        {SUGGESTIONS.map(s => (
          <button key={s} type="button" onClick={() => send(s)} className="font-mono text-[10px] px-2 py-1 rounded flex-shrink-0 whitespace-nowrap" style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}>
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={e => { e.preventDefault(); send() }} className="flex gap-2 pb-4 sm:pb-6 flex-shrink-0">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about tax deeds, counties, or a property..." className="flex-1 min-w-0 text-base sm:text-sm" style={{ height: '44px' }} disabled={loading} />
        <button type="submit" disabled={loading} className="font-mono text-xs tracking-widest px-4 sm:px-5 rounded flex-shrink-0" style={{ background: loading ? 'var(--gold-dim)' : 'var(--gold)', color: '#0a0a0a', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', height: '44px' }}>SEND</button>
      </form>
    </div>
  )
}
