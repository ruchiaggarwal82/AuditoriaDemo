import { useState } from 'react'
import { Bot, User, AlertTriangle, ChevronRight, Check } from 'lucide-react'

const PLACEHOLDER = `Describe your supplier payment inquiry process in plain English…`

const FULL_DETAIL_TEXT = `Our accounts payable team handles supplier payment inquiries for Sookti.ai. Monitoring email: ruchikumar111982@gmail.com. Team: AP Clerk (Priya Sharma), AP Manager (Raj Patel, for escalations), Finance Director (for invoices over $100,000).

Workflow:
1. AI classifies inbound email intent: PAYMENT_STATUS, INVOICE_APPROVAL, SHORT_PAY, REMITTANCE, or OUT_OF_SCOPE.
2. AI looks up the invoice in ERP using invoice number, PO number, or supplier name from the email.
3. If invoice is found, payment is scheduled or paid, and confidence is above 85%: auto-reply with payment date, method, and reference number. Response within 2 minutes.
4. If invoice is on hold, not found in ERP, or confidence is below 85%: escalate to AP Clerk via Slack (#ap-escalations). Human responds within 4 business hours.
5. For invoices above $25,000: always notify AP Manager even when auto-responding.
6. For invoices above $100,000: notify Finance Director and AP Manager before any response.
7. Short payment disputes: always escalate to AP Manager — never auto-respond.
8. Emails received outside business hours (Mon–Fri 9am–6pm IST): send an acknowledgment and promise next-business-day response.
9. All responses are logged in the audit trail.

Tone: professional, empathetic. Never reveal internal system names, hold reasons, or internal notes verbatim.`

const PRESET_WORKFLOW = {
  workflow_name: 'Supplier Payment Inquiry Handling',
  steps: [
    {
      step_number: 1,
      step_name: 'Receive & Classify Email',
      description: 'AI monitors ruchikumar111982@gmail.com and classifies inbound supplier emails into PAYMENT_STATUS, INVOICE_APPROVAL, SHORT_PAY, REMITTANCE, or OUT_OF_SCOPE.',
      who_is_involved: 'Digital Worker (AI)',
      how_they_are_reached: 'Email',
      what_action_is_expected: 'automated_only',
      ai_can_automate: true,
    },
    {
      step_number: 2,
      step_name: 'Look Up Invoice in ERP',
      description: 'AI extracts invoice number, PO number, or supplier name from the email and queries the ERP system for payment status and details.',
      who_is_involved: 'Digital Worker (AI)',
      how_they_are_reached: 'System automated',
      what_action_is_expected: 'automated_only',
      ai_can_automate: true,
    },
    {
      step_number: 3,
      step_name: 'Auto-Respond (High Confidence)',
      description: 'If invoice is found, payment is scheduled or paid, and confidence is above 85%, the AI replies within 2 minutes with payment date, method, and reference number.',
      who_is_involved: 'Digital Worker (AI)',
      how_they_are_reached: 'Email',
      what_action_is_expected: 'automated_only',
      ai_can_automate: true,
    },
    {
      step_number: 4,
      step_name: 'Escalate to AP Clerk',
      description: 'If invoice is on hold, not found in ERP, or confidence is below 85%, escalate to AP Clerk (Priya Sharma) via Slack (#ap-escalations). Human responds within 4 business hours.',
      who_is_involved: 'AP Clerk (Priya Sharma)',
      how_they_are_reached: 'Slack',
      what_action_is_expected: 'review',
      ai_can_automate: false,
    },
    {
      step_number: 5,
      step_name: 'High-Value Invoice Approval',
      description: 'For invoices above $25,000, always notify AP Manager (Raj Patel) even when auto-responding. For invoices above $100,000, notify Finance Director and AP Manager before any response.',
      who_is_involved: 'AP Manager',
      how_they_are_reached: 'Slack',
      what_action_is_expected: 'approve',
      ai_can_automate: false,
    },
    {
      step_number: 6,
      step_name: 'After-Hours Acknowledgment',
      description: 'Emails received outside Mon–Fri 9am–6pm IST receive an automated acknowledgment promising a next-business-day response.',
      who_is_involved: 'Digital Worker (AI)',
      how_they_are_reached: 'Email',
      what_action_is_expected: 'automated_only',
      ai_can_automate: true,
    },
  ],
  gaps_identified: [],
}

const SAMPLE_PROMPTS = [
  {
    label: 'Quick start',
    description: 'Minimal — AI will ask follow-up questions',
    text: `When a supplier emails us asking about payment status, our AP clerk checks the ERP system and looks up the invoice. If the invoice is found and payment is scheduled, they reply with the payment date. If the invoice is on hold or there's a discrepancy, they escalate to the AP Manager who reviews and responds within 1 business day. For invoices over $25,000, the AP Manager is always notified even if we can respond automatically.`,
  },
  {
    label: 'Detailed',
    description: 'More context — fewer follow-up questions',
    text: `When a supplier emails ruchikumar111982@gmail.com with a payment inquiry, our AP Clerk looks up the invoice in our ERP using the invoice number or PO number from the email. If the invoice is found and marked as scheduled or paid, we reply within 4 hours with the payment date, method (ACH or wire), and a reference number. If payment is on hold due to a PO mismatch, missing documentation, or pending approval, we escalate to the AP Manager via Slack and they respond within 1 business day. Any invoice above $25,000 USD requires AP Manager notification before a response is sent, even if the digital worker can answer autonomously. Short payments are always escalated — never auto-responded. We handle PAYMENT_STATUS, INVOICE_APPROVAL, and REMITTANCE inquiries autonomously when confidence is above 85% and the invoice is found in ERP. Out-of-scope or unrecognised emails are flagged for human review.`,
  },
  {
    label: 'Full detail',
    description: 'Complete spec — no questions asked',
    text: FULL_DETAIL_TEXT,
  },
]

export default function WorkflowMap({ onNext, onData, onDescription }) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [addressedGaps, setAddressedGaps] = useState({})
  const [isFullDetail, setIsFullDetail] = useState(false)

  const handleMap = async () => {
    if (!description.trim()) return

    // Full detail preset — skip Claude, use pre-seeded data directly
    if (isFullDetail) {
      setResult(PRESET_WORKFLOW)
      onData?.(PRESET_WORKFLOW)
      onDescription?.(description)
      return
    }

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
      onDescription?.(description)
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

      {/* Sample prompt chips */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="text-xs text-slate-400 self-center mr-1">Try a sample:</span>
        {SAMPLE_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setDescription(p.text)
              setIsFullDetail(p.label === 'Full detail')
              setResult(null)
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
            title={p.description}
          >
            {p.label}
          </button>
        ))}
      </div>

      <textarea
        value={description}
        onChange={(e) => { setDescription(e.target.value); setIsFullDetail(false) }}
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
