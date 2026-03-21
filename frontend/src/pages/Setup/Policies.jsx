import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, Edit2, ChevronRight, Bot, User } from 'lucide-react'

export default function Policies({ onNext, onBack, onData }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! Describe your accounts payable policies in plain English and I'll structure them for your digital worker. For example: \"Don't respond to invoices on hold without AP manager approval. For anything over $25,000 notify the AP manager even if we respond.\"",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [policies, setPolicies] = useState([])
  const [pendingQuestion, setPendingQuestion] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    if (!text.trim()) return
    const userMsg = { role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agent/extract-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text, existing_policies: policies }),
      })
      const data = await res.json()

      if (data.policies_extracted?.length) {
        setPolicies((prev) => {
          const existing = new Set(prev.map((p) => p.policy_id))
          const newOnes = data.policies_extracted.filter((p) => !existing.has(p.policy_id))
          return [...prev, ...newOnes]
        })
        onData?.([...policies, ...(data.policies_extracted || [])])
      }

      const question = data.suggested_questions?.[0]
      if (question) {
        setPendingQuestion(question)
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `I've extracted your policies. One question: ${question}` },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `Got it! I've added ${data.policies_extracted?.length ?? 0} policy rule(s). Add more policies or continue when ready.` },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, something went wrong. Make sure the backend is running.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const removePolicy = (id) => setPolicies((prev) => prev.filter((p) => p.policy_id !== id))

  return (
    <div className="p-8 max-w-3xl flex flex-col h-full">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Define your policies</h2>
      <p className="text-sm text-slate-500 mb-6">
        Describe your policies in plain English. The digital worker will ask if anything important is missing.
      </p>

      <div className="flex gap-6">
        {/* Chat */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col" style={{ height: 340 }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'assistant' ? 'bg-teal-100' : 'bg-slate-100'
                  }`}>
                    {msg.role === 'assistant' ? <Bot size={14} className="text-teal-600" /> : <User size={14} className="text-slate-600" />}
                  </div>
                  <div className={`max-w-xs rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-slate-50 text-slate-800 border border-slate-200'
                      : 'bg-teal-500 text-white'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center">
                    <Bot size={14} className="text-teal-600" />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-200 p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                placeholder="Describe a policy…"
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="w-9 h-9 bg-teal-500 hover:bg-teal-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Extracted policies */}
        <div className="w-56 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Extracted policies</p>
          {policies.length === 0 ? (
            <div className="text-xs text-slate-400 italic bg-slate-50 rounded-lg p-3 border border-slate-200">
              Policies will appear here as you describe them.
            </div>
          ) : (
            <div className="space-y-2">
              {policies.map((p) => (
                <div key={p.policy_id} className="bg-white rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold text-teal-600">{p.policy_id}</span>
                    <button onClick={() => removePolicy(p.policy_id)} className="text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-800 mb-1">{p.policy_name}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{p.trigger}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          Back
        </button>
        <button
          onClick={() => { onData?.(policies); onNext() }}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
