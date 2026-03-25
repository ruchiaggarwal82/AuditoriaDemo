import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, ChevronRight, Bot, User, AlertTriangle, Tag } from 'lucide-react'

// Infer which ERP fields a policy reads from based on trigger text
function inferFieldsFromPolicy(policy) {
  const text = ((policy.trigger || '') + ' ' + (policy.policy_name || '')).toLowerCase()
  const fields = []
  if (text.includes('hold') || text.includes('on_hold')) fields.push('invoice.hold_status')
  if (text.includes('hold reason') || text.includes('hold_reason')) fields.push('invoice.hold_reason')
  if (text.includes('amount') || text.includes('value') || text.includes('$') || text.includes('25,000') || text.includes('25000')) fields.push('invoice.amount')
  if (text.includes('status') && !text.includes('hold')) fields.push('invoice.status')
  if (text.includes('confidence')) {
    // confidence is internal, not an ERP field — skip
  }
  if (text.includes('due date') || text.includes('due_date') || text.includes('overdue')) fields.push('invoice.due_date')
  if (text.includes('payment date') || text.includes('payment_date')) fields.push('invoice.payment_date')
  if (text.includes('vendor') || text.includes('supplier')) fields.push('vendor.name')
  if (text.includes('currency')) fields.push('invoice.currency')
  // deduplicate
  return [...new Set(fields)]
}

export default function Policies({ onNext, onBack, onData, workflowDescription, fieldMap: fieldMapProp }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'll extract policies from your workflow description and you can add more. Describe any additional rules in plain English.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [policies, setPolicies] = useState([])
  const [seeded, setSeeded] = useState(false)
  const [confirmedFields, setConfirmedFields] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Load saved field map from backend (or use prop if passed forward)
  useEffect(() => {
    if (fieldMapProp?.length) {
      setConfirmedFields(fieldMapProp.map((r) => r.field))
      return
    }
    fetch('/api/workflow/field-map/worker-001')
      .then((r) => r.json())
      .then((data) => {
        if (data.field_map?.length) setConfirmedFields(data.field_map.map((r) => r.field))
      })
      .catch(() => {})
  }, [fieldMapProp])

  useEffect(() => {
    if (workflowDescription && !seeded) {
      setSeeded(true)
      extractPolicies(workflowDescription, [], true)
    }
  }, [workflowDescription])

  const extractPolicies = async (text, existingPolicies, isAuto = false) => {
    if (!text.trim()) return
    if (!isAuto) {
      setMessages((prev) => [...prev, { role: 'user', text }])
      setInput('')
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Extracting policies from your workflow description…' }])
    }
    setLoading(true)

    try {
      const res = await fetch('/api/agent/extract-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text, existing_policies: existingPolicies }),
      })
      const data = await res.json()

      if (data.policies_extracted?.length) {
        setPolicies((prev) => {
          const existing = new Set(prev.map((p) => p.policy_id))
          const newOnes = data.policies_extracted.filter((p) => !existing.has(p.policy_id))
          const merged = [...prev, ...newOnes]
          onData?.(merged)
          return merged
        })
      }

      const question = data.suggested_questions?.[0]
      if (!isAuto && question) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `I've added ${data.policies_extracted?.length ?? 0} policy rule(s). One question: ${question}` },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: isAuto
            ? `I've extracted ${data.policies_extracted?.length ?? 0} policies from your workflow. Add more below or click Continue.`
            : `Got it! I've added ${data.policies_extracted?.length ?? 0} policy rule(s). Add more or continue when ready.` },
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

  const sendMessage = (text) => extractPolicies(text, policies)
  const removePolicy = (id) => setPolicies((prev) => prev.filter((p) => p.policy_id !== id))

  return (
    <div className="p-8 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Define your policies</h2>
      <p className="text-sm text-slate-500 mb-6">
        Describe your policies in plain English. The digital worker will ask if anything important is missing.
      </p>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Chat */}
        <div className="w-[42%] flex-shrink-0 flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col flex-1 min-h-0">
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
        <div className="flex-1 flex flex-col min-h-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Extracted policies</p>
          {policies.length === 0 ? (
            <div className="text-xs text-slate-400 italic bg-slate-50 rounded-lg p-3 border border-slate-200">
              Policies will appear here as you describe them.
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 grid grid-cols-2 gap-2 content-start">
              {policies.map((p) => {
                const readsFrom = inferFieldsFromPolicy(p)
                const unmapped = readsFrom.filter((f) => confirmedFields.length > 0 && !confirmedFields.includes(f))
                return (
                  <div key={p.policy_id} className="bg-white rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold text-teal-600">{p.policy_id}</span>
                      <button onClick={() => removePolicy(p.policy_id)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-xs font-medium text-slate-800 mb-1">{p.policy_name}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{p.trigger}</p>

                    {readsFrom.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {readsFrom.map((f) => (
                          <span key={f} className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                            <Tag size={9} /> reads from: <span className="font-mono">{f}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {unmapped.length > 0 && (
                      <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                        <AlertTriangle size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 leading-snug">
                          This policy requires a field mapping you haven't completed yet.{' '}
                          <span className="font-medium underline cursor-default">Go to Systems step →</span>
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
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
