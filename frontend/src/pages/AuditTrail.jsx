import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Filter, ThumbsUp, ThumbsDown, Check, X, Send } from 'lucide-react'
import TopNav from '../components/TopNav'
import StatusBadge from '../components/StatusBadge'

// ── Step type pill ───────────────────────────────────────────────────────────
function TypePill({ type }) {
  if (type === 'DETERMINISTIC')
    return <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">DET</span>
  return <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">PROB</span>
}

// ── Confidence bar (compact) ─────────────────────────────────────────────────
function ConfBarMini({ value }) {
  const pct = Math.round((value || 0) * 100)
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-12 bg-slate-100 rounded-full h-1 inline-block">
        <span className={`block h-1 rounded-full ${pct >= 85 ? 'bg-teal-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-slate-500">{pct}%</span>
    </span>
  )
}

// ── Step 2 feedback ──────────────────────────────────────────────────────────
function AuditIntentFeedback({ entryId, initial, onSaved }) {
  const [state, setState] = useState(initial ? { submitted: true, ...initial } : {})

  const submit = async (type, data = {}) => {
    await fetch('/api/audit/step-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, step: 2, feedback_type: type, data }),
    })
    setState({ submitted: true, type, ...data })
    onSaved?.()
  }

  if (state.submitted) {
    return (
      <span className="text-xs text-slate-500">
        {state.type === 'thumbs_up' ? '👍 Correct' : `👎 Corrected${state.issue ? ' · ' + state.issue : ''}`}
      </span>
    )
  }
  if (state.showForm) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          className="text-xs border border-amber-200 rounded px-1.5 py-0.5 focus:outline-none"
          onChange={(e) => setState((s) => ({ ...s, issue: e.target.value }))}
        >
          <option value="">Reason…</option>
          <option value="wrong_intent">Wrong intent</option>
          <option value="ambiguous_message">Ambiguous message</option>
          <option value="other">Other</option>
        </select>
        <button onClick={() => submit('thumbs_down', { issue: state.issue || 'other' })} className="text-xs px-2 py-0.5 bg-amber-500 text-white rounded">Submit</button>
        <button onClick={() => setState({})} className="text-xs px-2 py-0.5 border border-slate-200 rounded text-slate-500">Cancel</button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => submit('thumbs_up')} className="text-xs px-2 py-0.5 border border-teal-200 text-teal-600 rounded hover:bg-teal-50">✓ Correct</button>
      <button onClick={() => setState({ showForm: true })} className="text-xs px-2 py-0.5 border border-amber-200 text-amber-600 rounded hover:bg-amber-50">✗ Wrong intent</button>
    </div>
  )
}

// ── Step 5 feedback ──────────────────────────────────────────────────────────
function AuditDraftFeedback({ entryId, initial, draftBody, onSaved }) {
  const [state, setState] = useState(initial ? { submitted: true, ...initial } : {})

  const submit = async (type, data = {}) => {
    await fetch('/api/audit/step-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, step: 5, feedback_type: type, data }),
    })
    setState({ submitted: true, type, ...data })
    onSaved?.()
  }

  if (state.submitted) {
    const label = state.type === 'approved' ? '✓ Approved' : state.type === 'edited' ? `✏ Edited` : '✗ Rejected'
    return <span className="text-xs text-slate-500">{label}</span>
  }
  if (state.editing) {
    return (
      <div className="mt-1 space-y-1">
        <textarea
          rows={3}
          defaultValue={draftBody}
          onChange={(e) => setState((s) => ({ ...s, edited: e.target.value }))}
          className="text-xs w-full border border-teal-300 rounded p-1.5 font-sans focus:outline-none"
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => submit('edited', { edit_summary: 'Edited in audit trail', edited_body: state.edited })}
            className="flex items-center gap-1 text-xs px-2 py-0.5 bg-teal-500 text-white rounded"
          ><Send size={10} /> Save</button>
          <button onClick={() => setState({})} className="text-xs px-2 py-0.5 border border-slate-200 rounded text-slate-500">Cancel</button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => submit('approved')} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-teal-500 text-white rounded"><Check size={10} /> Approve</button>
      <button onClick={() => setState({ editing: true })} className="text-xs px-2 py-0.5 border border-slate-200 text-slate-600 rounded hover:bg-slate-50">Edit</button>
      <button onClick={() => submit('rejected')} className="text-xs px-2 py-0.5 border border-red-200 text-red-500 rounded hover:bg-red-50">Reject</button>
    </div>
  )
}

// ── Step 6 feedback ──────────────────────────────────────────────────────────
function AuditFindingFeedback({ entryId, initial, onSaved }) {
  const [state, setState] = useState(initial ? { submitted: true, ...initial } : {})

  const submit = async (type) => {
    await fetch('/api/audit/step-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, step: 6, feedback_type: type, data: {} }),
    })
    setState({ submitted: true, type })
    onSaved?.()
  }

  if (state.submitted) {
    const label = { correct: '✓ Correct', incorrect: '✗ Incorrect', partial: '~ Partial' }[state.type] || state.type
    return <span className="text-xs text-slate-500">{label}</span>
  }
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => submit('correct')} className="text-xs px-2 py-0.5 border border-teal-200 text-teal-600 rounded hover:bg-teal-50">✓ Correct</button>
      <button onClick={() => submit('incorrect')} className="text-xs px-2 py-0.5 border border-red-200 text-red-500 rounded hover:bg-red-50">✗ Incorrect</button>
      <button onClick={() => submit('partial')} className="text-xs px-2 py-0.5 border border-amber-200 text-amber-600 rounded hover:bg-amber-50">~ Partial</button>
    </div>
  )
}

// ── Step row (compact + inline feedback for PROB steps) ──────────────────────
function AuditStepRow({ step, entryId, onFeedbackSaved }) {
  const r = step.result || {}
  const isProb = step.type === 'PROBABILISTIC'

  let summary = ''
  if (step.step === 1) summary = `Sender verified · Invoice ref ${r.invoice_reference_found ? 'found' : 'not found'} · Compliance ${r.compliance_check_passed ? 'passed' : 'failed'}`
  else if (step.step === 2) summary = `Classified as ${r.classified_intent} · ${Math.round((r.confidence || 0) * 100)}% confidence`
  else if (step.step === 3) summary = r.fields?.length ? `${r.fields.length} fields retrieved` : (r.note || 'No ERP lookup')
  else if (step.step === 4) summary = r.policy_triggered ? `${r.policy_triggered} triggered` : (r.check?.slice(0, 80) || 'No policy triggered')
  else if (step.step === 5) {
    if (r.method === 'template') summary = `Template: ${r.template_used}`
    else if (r.method === 'ai_draft') summary = r.draft_subject || 'AI draft generated'
    else summary = r.reason?.slice(0, 70) || 'Escalated per policy'
  }
  else if (step.step === 6) summary = r.finding?.slice(0, 90) + (r.finding?.length > 90 ? '…' : '')

  return (
    <div className={`py-2 border-b border-slate-100 last:border-0 ${isProb ? 'bg-amber-50/30' : ''}`}>
      <div className="flex items-start gap-2 text-xs">
        <span className="text-slate-400 w-4 flex-shrink-0 font-medium pt-0.5">{step.step}</span>
        <TypePill type={step.type} />
        <span className="font-medium text-slate-700 w-32 flex-shrink-0 pt-0.5">{step.name}</span>
        <span className="text-slate-500 flex-1 leading-relaxed pt-0.5">{summary}</span>
      </div>

      {/* Inline feedback for probabilistic steps */}
      {isProb && (
        <div className="ml-6 mt-1.5 pl-2 border-l-2 border-amber-200">
          {step.step === 2 && (
            <AuditIntentFeedback entryId={entryId} initial={step.feedback} onSaved={onFeedbackSaved} />
          )}
          {step.step === 5 && r.method === 'ai_draft' && (
            <AuditDraftFeedback entryId={entryId} initial={step.feedback} draftBody={r.draft_body} onSaved={onFeedbackSaved} />
          )}
          {step.step === 6 && (
            <AuditFindingFeedback entryId={entryId} initial={step.feedback} onSaved={onFeedbackSaved} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Step breakdown (collapsible, loads lazily) ───────────────────────────────
function AuditStepBreakdown({ entryId }) {
  const [open, setOpen] = useState(false)
  const [steps, setSteps] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const load = () => {
    if (steps && !loading) { setOpen((o) => !o); return }
    setLoading(true)
    fetch(`/api/audit/steps/${entryId}`)
      .then((r) => r.json())
      .then((d) => { setSteps(d.steps || []); setOpen(true); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const reload = () => {
    setLoading(true)
    fetch(`/api/audit/steps/${entryId}`)
      .then((r) => r.json())
      .then((d) => { setSteps(d.steps || []); setLoading(false); setRefresh((n) => n + 1) })
      .catch(() => setLoading(false))
  }

  return (
    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={load}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-600"
      >
        <span>Agent step breakdown · <span className="text-amber-600 font-semibold">give step feedback below</span></span>
        {loading ? <span className="text-slate-400">Loading…</span> : open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && steps && (
        <div className="px-3 py-1">
          {steps.map((step) => (
            <AuditStepRow key={`${step.step}-${refresh}`} step={step} entryId={entryId} onFeedbackSaved={reload} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Intent colour map ────────────────────────────────────────────────────────
const INTENT_COLORS = {
  PAYMENT_STATUS: 'payment_status',
  INVOICE_APPROVAL: 'invoice_approval',
  SHORT_PAY: 'short_pay',
  REMITTANCE: 'remittance',
  GENERAL_INQUIRY: 'general_inquiry',
  OUT_OF_SCOPE: 'out_of_scope',
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AuditTrail() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
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
                      <td className="px-4 py-3.5 text-slate-400">
                        {expanded === e.entry_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expanded === e.entry_id && (
                      <tr key={`exp-${e.entry_id}`}>
                        <td colSpan={7} className="px-5 pb-4 pt-0 bg-slate-50">
                          <div className="grid grid-cols-3 gap-4 text-xs mb-2">
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
                          </div>
                          <AuditStepBreakdown entryId={e.entry_id} />
                          <p className="text-xs text-slate-400 mt-2">
                            Feedback on probabilistic steps (amber) feeds directly into the learning pipeline and Dashboard quality metrics.
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
