import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are DeedVault's tax deed and foreclosure expert assistant. You help real estate investors research tax deed auctions, foreclosure sales, and distressed properties in Florida and Michigan. You know county-specific rules, redemption periods, bidding procedures, and investment strategies. Be concise, specific, and practical. When discussing specific counties, provide accurate information about their auction platforms, schedules, and rules.

Formatting: Never use markdown. No headers with ##, no bullet points with -, no bold with **, no checkmarks or decorative symbols. Write only clean plain conversational text with simple line breaks between paragraphs.`

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { messages?: ChatMessage[] }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiMessages = (body.messages ?? [])
    .filter(
      (m): m is ChatMessage =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .map(m => ({ role: m.role, content: m.content.trim() }))

  if (apiMessages.length === 0 || apiMessages[apiMessages.length - 1]?.role !== 'user') {
    return new Response(JSON.stringify({ error: 'Messages must end with a user message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const anthropic = new Anthropic({ apiKey })

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: apiMessages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream failed'
        controller.enqueue(encoder.encode(`\n\n[Error: ${message}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
