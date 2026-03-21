import { useState } from 'react'
import { Bot, User, AlertTriangle, ChevronRight, Check } from 'lucide-react'

const PLACEHOLDER = `e.g. When a supplier emails us asking about payment status, our AP clerk checks the ERP system and looks up the invoice. If the invoice is found and payment is scheduled, they reply with the payment date. If the invoice is on hold or there's a discrepancy, they escalate to the AP Manager who reviews and responds within 1 business day. For invoices over $25,000, the AP Manager is always notified even if we can respond automatically.`

export default function WorkflowMap({ onNext, onData }) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [addressedGaps, setAddressedGaps] = useState({})

  const handleMap = async () => {
    if (!description.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/map-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      setResult(data)
      onData?.(data)
    } catch (e) {
      setError('Could not reach the backend. Make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    onNext()
  }

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Map your workflow</h2>
      <p className="text-sm text-slate-500 mb-6">
        Describe your supplier payment inquiry process in plain English. The AI will structure it into steps.
      </p>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={6}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none bg-white"
      />

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      <button
        onClick={handleMap}
        disabled={loading || !description.trim()}
        className="mt-3 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mapping…</>
        ) : 'Map Workflow'}
      </button>

      {result && (
        <div className="mt-8 space-y-6">
          <h3 className="font-semibold text-slate-800">{result.workflow_name}</h3>

          {/* Steps timeline */}
          <div className="space-y-3">
            {result.steps?.map((step, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {step.step_number ?? idx + 1}
                  </div>
                  {idx < result.steps.length - 1 && (
                    <div className="w-px flex-1 bg-slate-200 my-1" />
                  )}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 mb-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{step.step_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    </div>
                    {step.ai_can_automate ? (
                      <span className="flex items-center gap-1 text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-full ml-3 flex-shrink-0">
                        <Check size={10} /> AI automated
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full ml-3 flex-shrink-0">
                        <User size={10} /> Human step
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-slate-400">
                    <span>👤 {step.who_is_involved}</span>
                    <span>📬 {step.how_they_are_reached}</span>
                    <span>⚡ {step.what_action_is_expected}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Gaps */}
          {result.gaps_identified?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-600" />
                <span className="font-semibold text-amber-800 text-sm">Gaps identified</span>
              </div>
              <div className="space-y-3">
                {result.gaps_identified.map((gap, idx) => (
                  <div key={idx} className="bg-white rounded-lg border border-amber-200 p-3">
                    <p className="text-sm text-amber-900 mb-2">{gap}</p>
                    {addressedGaps[idx] !== undefined ? (
                      <div className="flex items-center gap-1 text-xs text-teal-600">
                        <Check size={12} /> Addressed
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Your answer…"
                          className="flex-1 text-xs border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              setAddressedGaps((prev) => ({ ...prev, [idx]: e.target.value }))
                            }
                          }}
                        />
                        <button
                          className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1.5 rounded transition-colors"
                          onClick={(e) => {
                            const input = e.target.previousSibling
                            if (input.value.trim()) {
                              setAddressedGaps((prev) => ({ ...prev, [idx]: input.value }))
                            }
                          }}
                        >
                          Address
                        </button>
                        <button
                          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5"
                          onClick={() => setAddressedGaps((prev) => ({ ...prev, [idx]: 'skipped' }))}
                        >
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleContinue}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Looks good, continue <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
