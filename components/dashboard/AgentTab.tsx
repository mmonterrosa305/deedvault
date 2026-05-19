'use client'

import { useState, useRef, useEffect } from 'react'
import { LISTINGS, fmt, daysUntilAuction } from '@/lib/listings'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'What is the redemption period in Miami-Dade?',
  'Explain the difference between Live and OCP auctions',
  'Analyze FL-DAD-001 as an investment',
  'Wayne County Michigan bidding process',
]

function mockAgentReply(input: string): string {
  const q = input.toLowerCase()
  if (q.includes('miami') && (q.includes('redemption') || q.includes('redeem'))) {
    return 'Miami-Dade County tax deed sales typically involve a 30-day redemption period after the auction for prior owners to reclaim the property by paying the amount bid plus fees. Always verify current statutes and clerk procedures before bidding.'
  }
  if (q.includes('redemption')) {
    return 'Redemption periods vary by county and state. Florida counties often use 30-day or longer periods depending on whether the sale was a tax deed or lien certificate. Michigan redemption rules differ by county treasurer policies — confirm with the specific county before closing.'
  }
  if (q.includes('ocp') || q.includes('over-the-counter')) {
    return 'OCP (over-the-counter) sales let you purchase available tax deed certificates directly from the county without a competitive auction. Inventory changes daily. Visit the county treasurer or clerk office, review the OCP list, and complete their application with certified funds.'
  }
  if (q.includes('live') && q.includes('online')) {
    return 'Live auctions are held in person at the courthouse with open outcry bidding. Online auctions run on platforms like GovEase, RealTDX, or Bid4Assets with timed bidding windows. Live sales require physical presence and immediate payment rules; online sales offer remote access but platform fees and deposit requirements apply.'
  }
  const idMatch = input.match(/[A-Z]{2}-[A-Z]{3}-\d{3}/i)
  if (idMatch) {
    const listing = LISTINGS.find(l => l.id.toUpperCase() === idMatch[0].toUpperCase())
    if (listing) {
      const ratio = ((listing.minBid / listing.assessed) * 100).toFixed(0)
      const days = daysUntilAuction(listing.date)
      return `Analysis for ${listing.id}:\n\nAddress: ${listing.addr}\nMin bid: ${fmt(listing.minBid)} (${ratio}% of assessed ${fmt(listing.assessed)})\nAuction: ${listing.auction} via ${listing.platform} on ${listing.date} (${days} days out)\nType: ${listing.prop} in ${listing.county} County, ${listing.state}\n\nDue diligence: run a full title search, confirm lien stack, verify occupancy, and check county-specific redemption and quiet-title requirements before bidding.`
    }
  }
  if (q.includes('wayne') || q.includes('detroit')) {
    return 'Wayne County Michigan tax sales are often conducted online through Bid4Assets or via the Wayne County Treasurer. Detroit parcels frequently have low opening bids but require careful title and blight review. Register on the platform, pay deposits, and confirm post-sale deed recording timelines with the treasurer.'
  }
  return 'I can help with tax deed investing basics, Florida and Michigan county rules, redemption periods, auction types, and property-specific analysis. Try asking about a listing ID (e.g. FL-DAD-001), a county name, or redemption rules. (Demo mode — connect ANTHROPIC_API_KEY for live Claude responses.)'
}

export default function AgentTab() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Welcome to the DeedVault Agent. I specialize in Florida and Michigan tax deed intelligence. Ask about county rules, redemption periods, auction types, or a specific property ID.' },
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
    setMessages(m => [...m, { role: 'user', content: msg }])
    setLoading(true)
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
    setMessages(m => [...m, { role: 'assistant', content: mockAgentReply(msg) }])
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-4xl mx-auto px-4 sm:px-6">
      <div className="py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>DEEDVAULT AGENT</p>
        <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>Tax deed Q&A · county rules · property analysis (demo)</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap" style={{
              background: m.role === 'user' ? 'var(--gold-glow)' : 'var(--panel)',
              border: `1px solid ${m.role === 'user' ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
              color: 'var(--text)',
            }}>
              {m.role === 'assistant' && <span className="font-mono text-[10px] block mb-1" style={{ color: 'var(--gold)' }}>AGENT</span>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 flex-wrap pb-2 flex-shrink-0">
        {SUGGESTIONS.map(s => (
          <button key={s} type="button" onClick={() => send(s)} className="font-mono text-[10px] px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}>
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={e => { e.preventDefault(); send() }} className="flex gap-2 pb-6 flex-shrink-0">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about tax deeds, counties, or a property..." className="flex-1" style={{ height: '44px' }} disabled={loading} />
        <button type="submit" disabled={loading} className="font-mono text-xs tracking-widest px-5 rounded" style={{ background: loading ? 'var(--gold-dim)' : 'var(--gold)', color: '#0a0a0a', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', height: '44px' }}>SEND</button>
      </form>
    </div>
  )
}
