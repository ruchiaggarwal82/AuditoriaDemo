import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import TopNav from '../components/TopNav'
import StatusBadge from '../components/StatusBadge'

const INTENT_COLORS = {
  PAYMENT_STATUS: 'payment_status',
  INVOICE_APPROVAL: 'invoice_approval',
  SHORT_PAY: 'short_pay',
  REMITTANCE: 'remittance',
  GENERAL_INQUIRY: 'general_inquiry',
  OUT_OF_SCOPE: 'out_of_scope',
}

const FEEDBACK_OPTIONS = [
  'Wrong information',
  'Wrong tone',
  'Should have escalated',
  'Should not have escalated',
  'Other',
]

export default function AuditTrail() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [feedbackOpen, setFeedbackOpen] = useState(null)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [escFeedbackOpen, setEscFeedbackOpen] = useState(null)
  const [escFeedbackNote, setEscFeedbackNote] = useState('')
  const [filterOutcome, setFilterOutcome] = useState('all')
  const [filterIntent, setFilterIntent] = useState('all')

  const fetchLog = async () => {
    try {
      const res = await fetch('/api/audit/log?limit=50')
      setEntries(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchLog() }, [])

  const submitFeedback = async (entry_id, feedback, note = '') => {
    await fetch('/api/audit/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id, feedback, note }),
    })
    setFeedbackOpen(null)
    setFeedbackNote('')
    fetchLog()
  }

  const submitEscalationFeedback = async (entry_id, escalation_feedback, escalation_feedback_note = '') => {
    await fetch('/api/audit/escalation-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id, escalation_feedback, escalation_feedback_note }),
    })
    setEscFeedbackOpen(null)
    setEscFeedbackNote('')
    fetchLog()
  }

  const filtered = entries.filter((e) => {
    if (filterOutcome !== 'all' && e.outcome?.toLowerCase() !== filterOutcome) return false
    if (filterIntent !== 'all' && e.intent_classified !== filterIntent) return false
    return true
  })

  const fmt = (ts) => ts ? new Date(ts).toLocaleString() : '—'

  return (
    <div className="min-h-full">
      <TopNav title="Audit Trail" subtitle="Every interaction logged with full context" />

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center gap-4">
        <Filter size={14} className="text-slate-400" />
        <select
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="all">All outcomes</option>
          <option value="autonomous">Autonomous</option>
          <option value="escalated">Escalated</option>
        </select>
        <select
          value={filterIntent}
          onChange={(e) => setFilterIntent(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="all">All intents</option>
          <option value="PAYMENT_STATUS">Payment Status</option>
          <option value="INVOICE_APPROVAL">Invoice Approval</option>
          <option value="SHORT_PAY">Short Pay</option>
          <option value="REMITTANCE">Remittance</option>
          <option value="GENERAL_INQUIRY">General Inquiry</option>
          <option value="OUT_OF_SCOPE">Out of Scope</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} entries</span>
      </div>

      <div className="px-8 py-6">
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-400">No audit entries yet.</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Timestamp</th>
                  <th className="px-5 py-3 text-left">Supplier</th>
                  <th className="px-5 py-3 text-left">Intent</th>
                  <th className="px-5 py-3 text-left">Confidence</th>
                  <th className="px-5 py-3 text-left">ERP Found</th>
                  <th className="px-5 py-3 text-left">Outcome</th>
                  <th className="px-5 py-3 text-left">Quality Feedback</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((e) => (
                  <>
                    <tr
                      key={e.entry_id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => setExpanded(expanded === e.entry_id ? null : e.entry_id)}
                    >
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{fmt(e.timestamp)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-800 max-w-xs truncate">{e.email_from}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge type={INTENT_COLORS[e.intent_classified] || 'general_inquiry'} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${Math.round((e.confidence || 0) * 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{Math.round((e.confidence || 0) * 100)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium ${e.invoice_found ? 'text-teal-600' : 'text-slate-400'}`}>
                          {e.invoice_found ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge type={e.outcome?.toLowerCase()} />
                      </td>
                      <td className="px-5 py-3.5" onClick={(ev) => ev.stopPropagation()}>
                        {e.outcome === 'ESCALATED' ? (
                          /* Escalation quality feedback */
                          e.escalation_feedback ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${e.escalation_feedback === 'justified' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-700'}`}>
                              {e.escalation_feedback === 'justified' ? '✓ Justified' : '✗ Should automate'}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => submitEscalationFeedback(e.entry_id, 'justified')}
                                className="text-xs px-2 py-1 rounded border border-teal-200 text-teal-600 hover:bg-teal-50 transition-colors"
                              >
                                ✓ Justified
                              </button>
                              <button
                                onClick={() => setEscFeedbackOpen(escFeedbackOpen === e.entry_id ? null : e.entry_id)}
                                className="text-xs px-2 py-1 rounded border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors"
                              >
                                ✗ Shouldn't escalate
                              </button>
                            </div>
                          )
                        ) : (
                          /* Response quality feedback */
                          e.feedback ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${e.feedback === 'positive' ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'}`}>
                              {e.feedback === 'positive' ? '👍' : '👎'} {e.feedback}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => submitFeedback(e.entry_id, 'positive')}
                                className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                              >
                                <ThumbsUp size={14} />
                              </button>
                              <button
                                onClick={() => setFeedbackOpen(feedbackOpen === e.entry_id ? null : e.entry_id)}
                                className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <ThumbsDown size={14} />
                              </button>
                            </div>
                          )
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {expanded === e.entry_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                    </tr>

                    {/* Negative feedback form */}
                    {feedbackOpen === e.entry_id && (
                      <tr key={`fb-${e.entry_id}`}>
                        <td colSpan={8} className="px-5 pb-3 pt-0 bg-red-50">
                          <div className="border border-red-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-red-700 mb-3">What was wrong?</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {FEEDBACK_OPTIONS.map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => setFeedbackNote(opt)}
                                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${feedbackNote === opt ? 'bg-red-500 text-white border-red-500' : 'border-red-200 text-red-700 hover:bg-red-100'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                value={feedbackNote === 'Other' || !FEEDBACK_OPTIONS.includes(feedbackNote) ? feedbackNote : ''}
                                onChange={(ev) => setFeedbackNote(ev.target.value)}
                                placeholder="Additional notes (optional)"
                                className="flex-1 text-xs border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                              />
                              <button
                                onClick={() => submitFeedback(e.entry_id, 'negative', feedbackNote)}
                                className="px-3 py-2 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                              >
                                Submit
                              </button>
                              <button
                                onClick={() => setFeedbackOpen(null)}
                                className="px-3 py-2 text-slate-500 text-xs border border-slate-200 rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Escalation "shouldn't escalate" feedback form */}
                    {escFeedbackOpen === e.entry_id && (
                      <tr key={`escfb-${e.entry_id}`}>
                        <td colSpan={8} className="px-5 pb-3 pt-0 bg-amber-50">
                          <div className="border border-amber-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-amber-700 mb-2">What should the digital worker have done?</p>
                            <div className="flex gap-2">
                              <input
                                value={escFeedbackNote}
                                onChange={(ev) => setEscFeedbackNote(ev.target.value)}
                                placeholder="e.g. Invoice was in ERP under different reference, DW should have responded autonomously"
                                className="flex-1 text-xs border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                              <button
                                onClick={() => submitEscalationFeedback(e.entry_id, 'should_have_automated', escFeedbackNote)}
                                className="px-3 py-2 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600"
                              >
                                Submit
                              </button>
                              <button
                                onClick={() => setEscFeedbackOpen(null)}
                                className="px-3 py-2 text-slate-500 text-xs border border-slate-200 rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Expanded row */}
                    {expanded === e.entry_id && (
                      <tr key={`exp-${e.entry_id}`}>
                        <td colSpan={8} className="px-5 pb-4 pt-0 bg-slate-50">
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <p className="font-semibold text-slate-500 mb-1">Subject</p>
                              <p className="text-slate-800">{e.email_subject}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-500 mb-1">Invoice ID</p>
                              <p className="text-slate-800">{e.invoice_id ?? '—'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-500 mb-1">Processing time</p>
                              <p className="text-slate-800">{e.processing_time_ms}ms</p>
                            </div>
                            {e.escalation_reason && (
                              <div className="col-span-3">
                                <p className="font-semibold text-slate-500 mb-1">Escalation reason</p>
                                <p className="text-amber-700">{e.escalation_reason}</p>
                              </div>
                            )}
                            {e.feedback_note && (
                              <div className="col-span-3">
                                <p className="font-semibold text-slate-500 mb-1">Feedback note</p>
                                <p className="text-red-700">{e.feedback_note}</p>
                              </div>
                            )}
                            {e.escalation_feedback_note && (
                              <div className="col-span-3">
                                <p className="font-semibold text-slate-500 mb-1">Escalation feedback note</p>
                                <p className="text-amber-700">{e.escalation_feedback_note}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-4 text-center">
          Feedback you provide here becomes training signal for improving the digital worker over time.
        </p>
      </div>
    </div>
  )
}
