import { useState, useEffect, useCallback } from 'react'
import { Play, Square, RefreshCw, Mail, ThumbsUp, ThumbsDown, Send, Check, Lightbulb, X, ChevronRight, ShieldCheck, ChevronDown, ChevronUp, Pencil, BookOpen } from 'lucide-react'
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

function isPolicyMandated(email) {
  const reason = (email.escalation_reason || '').toLowerCase()
  const status = (email.erp_detail?.status || '')
  return status === 'on_hold' || reason.includes('on hold') || reason.includes('on_hold')
}

// ── Type badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  if (type === 'DETERMINISTIC') {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">DETERMINISTIC</span>
  }
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">PROBABILISTIC</span>
}

// ── Confidence bar ───────────────────────────────────────────────────────────
function ConfBar({ value }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct >= 85 ? 'bg-teal-500' : 'bg-amber-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-8 text-right">{pct}%</span>
    </div>
  )
}

// ── Step 2 feedback ──────────────────────────────────────────────────────────
function IntentFeedback({ entryId, initial, onSaved }) {
  const [state, setState] = useState(initial ? { submitted: true, ...initial } : {})

  const submit = async (type, extra = {}) => {
    await fetch('/api/audit/step-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, step: 2, feedback_type: type, data: extra }),
    })
    setState({ submitted: true, type, ...extra })
    onSaved?.()
  }

  if (state.submitted) {
    return (
      <p className="text-xs text-teal-700 bg-teal-50 px-2 py-1 rounded mt-2">
        {state.type === 'thumbs_up' ? '👍 Marked correct' : `👎 Correction noted${state.note ? ': ' + state.note : ''}`}
      </p>
    )
  }
  if (state.showForm) {
    return (
      <div className="mt-2 space-y-1.5">
        <select
          onChange={(e) => setState((s) => ({ ...s, issue: e.target.value }))}
          className="text-xs border border-amber-200 rounded px-2 py-1 w-full focus:outline-none"
        >
          <option value="">Select reason…</option>
          <option value="wrong_intent">Wrong intent</option>
          <option value="ambiguous_message">Ambiguous message</option>
          <option value="other">Other</option>
        </select>
        <input
          placeholder="Optional note…"
          className="text-xs border border-amber-200 rounded px-2 py-1 w-full focus:outline-none"
          onChange={(e) => setState((s) => ({ ...s, note: e.target.value }))}
        />
        <div className="flex gap-1.5">
          <button onClick={() => submit('thumbs_down', { issue: state.issue, note: state.note })} className="text-xs px-3 py-1 bg-amber-500 text-white rounded">Submit</button>
          <button onClick={() => setState({})} className="text-xs px-3 py-1 border border-slate-200 rounded text-slate-500">Cancel</button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-2 mt-2">
      <button onClick={() => submit('thumbs_up')} className="flex items-center gap-1 text-xs px-2 py-1 border border-teal-200 text-teal-600 rounded hover:bg-teal-50">
        <ThumbsUp size={11} /> Correct
      </button>
      <button onClick={() => setState({ showForm: true })} className="flex items-center gap-1 text-xs px-2 py-1 border border-amber-200 text-amber-600 rounded hover:bg-amber-50">
        <ThumbsDown size={11} /> Wrong intent
      </button>
    </div>
  )
}

// ── Step 5 draft feedback ────────────────────────────────────────────────────
function DraftFeedback({ entryId, initial, onSaved }) {
  const [state, setState] = useState(initial ? { submitted: true, ...initial } : {})
  const [sending, setSending] = useState(false)

  const sendApproval = async (bodyOverride) => {
    setSending(true)
    try {
      await fetch('/api/email/approve-and-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id: entryId,
          draft_body: bodyOverride || state.draftBody,
          draft_subject: state.draftSubject,
        }),
      })
    } catch (e) {
      console.error('approve-and-send failed:', e)
    }
    setSending(false)
  }

  const submit = async (type, extra = {}) => {
    await fetch('/api/audit/step-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, step: 5, feedback_type: type, data: extra }),
    })
    if (type === 'approved') await sendApproval()
    if (type === 'edited') await sendApproval(extra.edited_body)
    setState({ submitted: true, type, ...extra })
    onSaved?.()
  }

  if (state.submitted) {
    const sent = state.type === 'approved' || state.type === 'edited'
    const label = state.type === 'approved' ? '✓ Sent to supplier'
      : state.type === 'edited' ? `✓ Sent (edited) — "${state.edit_summary}"`
      : '✗ Rejected'
    return (
      <div className="flex items-center gap-3 mt-2">
        <p className={`text-xs px-2 py-1 rounded border ${sent ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          {label}
        </p>
        {!sent && (
          <button
            disabled={sending}
            onClick={() => submit('approved')}
            className="flex items-center gap-1 text-xs px-3 py-1 bg-teal-500 text-white rounded disabled:opacity-60"
          >
            {sending ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={11} />}
            Approve &amp; send
          </button>
        )}
      </div>
    )
  }
  if (state.editing) {
    return (
      <div className="mt-2 space-y-1.5">
        <textarea
          rows={5}
          defaultValue={state.original}
          onChange={(e) => setState((s) => ({ ...s, edited: e.target.value }))}
          className="text-xs w-full border border-teal-300 rounded-lg p-2 font-sans focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <input
          placeholder="What did you change? (optional)"
          className="text-xs border border-slate-200 rounded px-2 py-1 w-full focus:outline-none"
          onChange={(e) => setState((s) => ({ ...s, editNote: e.target.value }))}
        />
        <div className="flex gap-1.5">
          <button
            disabled={sending}
            onClick={() => submit('edited', { edit_summary: state.editNote || 'Response edited before sending', edited_body: state.edited })}
            className="flex items-center gap-1 text-xs px-3 py-1 bg-teal-500 text-white rounded disabled:opacity-60"
          >
            {sending ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={11} />}
            Send edited version
          </button>
          <button onClick={() => setState((s) => ({ draftBody: s.draftBody, draftSubject: s.draftSubject }))} className="text-xs px-3 py-1 border border-slate-200 rounded text-slate-500">Cancel</button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-2 mt-2">
      <button disabled={sending} onClick={() => submit('approved')} className="flex items-center gap-1 text-xs px-3 py-1 bg-teal-500 text-white rounded disabled:opacity-60">
        {sending ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={11} />}
        Approve &amp; send
      </button>
      <button
        onClick={() => setState((s) => ({ ...s, editing: true, original: s.draftBody }))}
        className="flex items-center gap-1 text-xs px-3 py-1 border border-slate-200 text-slate-600 rounded hover:bg-slate-50"
      >
        <Pencil size={11} /> Edit
      </button>
      <button onClick={() => submit('rejected')} className="text-xs px-3 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50">
        Reject
      </button>
    </div>
  )
}

// ── Step 6 finding feedback ──────────────────────────────────────────────────
function FindingFeedback({ entryId, initial, onSaved }) {
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
    const label = { correct: '✓ Correct', incorrect: '✗ Incorrect', partial: '~ Partially correct' }[state.type] || state.type
    return <p className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">{label}</p>
  }
  return (
    <div className="flex gap-1.5 flex-wrap">
      <button onClick={() => submit('correct')} className="text-xs px-2 py-1 border border-teal-200 text-teal-600 rounded hover:bg-teal-50">✓ Correct</button>
      <button onClick={() => submit('incorrect')} className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50">✗ Incorrect</button>
      <button onClick={() => submit('partial')} className="text-xs px-2 py-1 border border-amber-200 text-amber-600 rounded hover:bg-amber-50">~ Partially correct</button>
    </div>
  )
}

// ── Single step card ─────────────────────────────────────────────────────────
function StepCard({ step, entryId, onFeedbackSaved }) {
  const borderColor = step.type === 'DETERMINISTIC' ? 'border-teal-100' : 'border-amber-100'
  const bgColor = step.type === 'DETERMINISTIC' ? 'bg-teal-50/40' : 'bg-amber-50/40'
  const r = step.result || {}

  const renderBody = () => {
    if (step.step === 1) {
      const items = [
        { label: 'Sender verified', ok: r.sender_verified },
        { label: 'Invoice number in email text', ok: r.invoice_reference_found, tooltip: 'Checks whether the email body contains an invoice reference number. The actual ERP lookup happens in Step 3.' },
        { label: 'Compliance check passed', ok: r.compliance_check_passed },
      ]
      return (
        <div className="space-y-1">
          {items.map(({ label, ok, tooltip }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className={ok ? 'text-teal-600' : 'text-amber-500'}>{ok ? '✓' : '✗'}</span>
              <span className="text-slate-600" title={tooltip}>{label}{tooltip && <span className="text-slate-400 ml-1 cursor-help">ⓘ</span>}</span>
              <span className={`ml-auto font-medium ${ok ? 'text-teal-600' : 'text-amber-600'}`}>{ok ? 'Yes' : 'No'}</span>
            </div>
          ))}
        </div>
      )
    }

    if (step.step === 2) {
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge type={INTENT_COLORS[r.classified_intent] || 'general_inquiry'} />
          </div>
          <ConfBar value={r.confidence} />
          {r.alternatives?.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-slate-400 font-medium">Alternatives considered</p>
              {r.alternatives.map((a) => (
                <div key={a.intent} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 w-32 truncate">{a.intent}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1">
                    <div className="bg-slate-300 h-1 rounded-full" style={{ width: `${Math.round(a.score * 100)}%` }} />
                  </div>
                  <span className="text-slate-400 w-6 text-right">{Math.round(a.score * 100)}%</span>
                </div>
              ))}
            </div>
          )}
          <IntentFeedback entryId={entryId} initial={step.feedback} onSaved={onFeedbackSaved} />
        </div>
      )
    }

    if (step.step === 3) {
      if (r.note) return <p className="text-xs text-slate-500 italic">{r.note}</p>
      if (!r.fields?.length) return <p className="text-xs text-slate-400 italic">No fields retrieved.</p>
      return (
        <div className="space-y-1">
          {r.fields.map((f, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${f.status === 'not_found' || f.status === 'null' ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-slate-100'}`}>
              <span className="font-mono text-teal-700 w-40 flex-shrink-0">{f.field}</span>
              <span className="text-slate-400 font-mono text-xs truncate flex-1">{f.path}</span>
              <span className={`font-medium ml-auto flex-shrink-0 ${f.status === 'not_found' ? 'text-amber-600' : f.status === 'null' ? 'text-slate-400' : 'text-slate-800'}`}>
                {f.value === null || f.value === undefined ? '—' : String(f.value)}
              </span>
              {(f.status === 'not_found' || f.status === 'null') && (
                <span
                  className="text-amber-500 ml-1 cursor-help"
                  title={f.status === 'not_found'
                    ? 'Invoice not found in ERP — this invoice ID does not exist in the system, or the ERP path mapping may need review in Setup → Systems.'
                    : 'Field value is null or empty in ERP — the invoice exists but this field has no data.'}
                >⚠</span>
              )}
            </div>
          ))}
        </div>
      )
    }

    if (step.step === 4) {
      if (!r.policy_triggered) {
        return <p className="text-xs text-slate-500">{r.check}</p>
      }
      return (
        <div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs mb-1">
            <span className="font-semibold text-amber-700">{r.policy_triggered}</span>
            {r.policy_name && <span className="text-amber-600"> — {r.policy_name}</span>}
          </div>
          {r.trigger_field && (
            <p className="text-xs text-slate-500">
              Triggered by <span className="font-mono text-teal-700">{r.trigger_field}</span> = <span className="font-mono font-medium text-slate-700">{r.trigger_value}</span>
            </p>
          )}
          {r.check && <p className="text-xs text-slate-400 mt-1">{r.check}</p>}
        </div>
      )
    }

    if (step.step === 5) {
      if (r.method === 'template') {
        return (
          <p className="text-xs text-slate-600">
            Template used: <span className="font-medium text-slate-800">{r.template_used}</span>
            <span className="text-slate-400 ml-1">({r.template_id})</span>
          </p>
        )
      }
      if (r.method === 'ai_draft') {
        return (
          <div>
            {r.policy_note && (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 mb-2">
                <span className="font-medium text-teal-700">Policy (Step 4):</span> {r.policy_note}
              </p>
            )}
            <p className="text-xs font-medium text-slate-700 mb-1">{r.draft_subject}</p>
            <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-white rounded-lg p-2.5 font-sans leading-relaxed border border-slate-200 max-h-36 overflow-y-auto">{r.draft_body}</pre>
            <DraftFeedback
              entryId={entryId}
              initial={step.feedback ? { ...step.feedback, draftBody: r.draft_body, draftSubject: r.draft_subject } : { draftBody: r.draft_body, draftSubject: r.draft_subject }}
              onSaved={onFeedbackSaved}
            />
          </div>
        )
      }
      // Escalation steps
      return (
        <div>
          <p className="text-xs text-slate-600">{r.reason || 'Escalated to AP Manager.'}</p>
          {r.escalated_to && <p className="text-xs text-slate-400 mt-1">Routed to: {r.escalated_to}</p>}
          {r.method === 'low_confidence' && r.confidence && (
            <div className="mt-2"><ConfBar value={r.confidence} /></div>
          )}
        </div>
      )
    }

    if (step.step === 6) {
      return (
        <div>
          <p className="text-xs text-slate-700 leading-relaxed mb-1">{r.finding}</p>
          <p className="text-xs text-slate-400 mb-2">Source: {r.source}</p>
          <div className="mb-2"><ConfBar value={r.confidence} /></div>
          <p className="text-xs font-medium text-slate-500 mb-1">Is this finding accurate?</p>
          <FindingFeedback entryId={entryId} initial={step.feedback} onSaved={onFeedbackSaved} />
        </div>
      )
    }

    return null
  }

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{step.step}</span>
          <span className="text-xs font-semibold text-slate-800">{step.name}</span>
        </div>
        <TypeBadge type={step.type} />
      </div>
      {renderBody()}
    </div>
  )
}

// ── Step breakdown panel ─────────────────────────────────────────────────────
function StepBreakdown({ email, onFeedbackSaved }) {
  const [steps, setSteps] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSteps(null)
    setLoading(true)
    fetch(`/api/audit/steps/${email.entry_id}`)
      .then((r) => r.json())
      .then((d) => { setSteps(d.steps || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [email.entry_id])

  if (loading) return <div className="text-xs text-slate-400 p-4">Loading steps…</div>
  if (!steps?.length) return <div className="text-xs text-slate-400 p-4">No step data available.</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Agent Steps</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500" /> <span className="text-xs text-slate-400">Deterministic</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 ml-2" /> <span className="text-xs text-slate-400">Probabilistic</span>
        </div>
      </div>
      {steps.map((step) => (
        <StepCard key={step.step} step={step} entryId={email.entry_id} onFeedbackSaved={onFeedbackSaved} />
      ))}
    </div>
  )
}

// ── Policies read-only modal ─────────────────────────────────────────────────
function PoliciesModal({ onClose }) {
  const [policies, setPolicies] = useState(null)
  const [source, setSource] = useState(null)

  useEffect(() => {
    fetch('/api/workflow/active-policies/worker-001')
      .then((r) => r.json())
      .then((data) => { setPolicies(data.policies || []); setSource(data.source) })
      .catch(() => setPolicies([]))
  }, [])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
              <BookOpen size={14} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Active Policies</p>
              <p className="text-xs text-slate-500">Applied in Step 4 · Policy Match</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {policies === null ? (
            <p className="text-xs text-slate-400">Loading…</p>
          ) : (
            <div className="space-y-3">
              {source === 'defaults' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  System default policies — these are always enforced. Customise them in Setup → Policies.
                </div>
              )}
              {policies.map((p) => (
                <div key={p.policy_id} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{p.policy_id}</span>
                    <span className="text-xs font-semibold text-slate-700">{p.policy_name || p.title}</span>
                    <span className="ml-auto text-xs px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded font-medium">DETERMINISTIC</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{p.trigger || p.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">Read-only · Edit in Setup → Policies</p>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Suggestions modal ────────────────────────────────────────────────────────
function SuggestionsModal({ suggestions, onApprove, onDismiss, onClose }) {
  const [active, setActive] = useState(suggestions[0]?.id)
  const current = suggestions.find((s) => s.id === active) || suggestions[0]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <Lightbulb size={14} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Suggested Improvements</p>
              <p className="text-xs text-slate-500">Detected from feedback patterns · {suggestions.length} pending</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>

        {suggestions.length > 1 && (
          <div className="flex border-b border-slate-100 px-6 gap-4 overflow-x-auto">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${active === s.id ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {s.title.split(' ').slice(0, 5).join(' ')}…
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">{current.title}</h3>
            {current.source_step && (
              <span className="inline-flex items-center gap-1 text-xs text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full mb-2">
                Triggered by Step {current.source_step}
              </span>
            )}
            <p className="text-sm text-slate-500 leading-relaxed">{current.pattern}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evidence from audit log</p>
            <div className="space-y-1.5">
              {current.evidence.map((e, i) => (
                <div key={i} className="flex gap-2 text-xs text-slate-600">
                  <span className="text-violet-400 flex-shrink-0">•</span> {e}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">Proposed policy change</p>
            <p className="text-sm text-violet-900 leading-relaxed">{current.proposed_policy}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Risk level</p>
              <p className="text-sm font-semibold text-slate-800">{current.risk_level}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center col-span-2">
              <p className="text-xs text-slate-500 mb-1">Expected impact</p>
              <p className="text-sm font-semibold text-slate-800">{current.impact}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5">
            <ShieldCheck size={13} className="text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-teal-700"><strong>Fallback guaranteed:</strong> {current.fallback}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={() => onDismiss(current.id)} className="text-xs text-slate-400 hover:text-slate-600">Dismiss suggestion</button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Review later</button>
            <button onClick={() => onApprove(current.id)} className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg">
              Approve &amp; activate <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Monitor page ────────────────────────────────────────────────────────
export default function Monitor() {
  const [status, setStatus] = useState({ polling_active: false, last_checked: null, emails_processed_today: 0 })
  const [recent, setRecent] = useState([])
  const [selected, setSelected] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionState, setSuggestionState] = useState({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showPolicies, setShowPolicies] = useState(false)

  const pendingSuggestions = suggestions.filter((s) => (suggestionState[s.id] ?? 'pending') === 'pending')

  const approveSuggestion = (id) => setSuggestionState((prev) => {
    const next = { ...prev, [id]: 'approved' }
    if (suggestions.filter((s) => s.id !== id && (next[s.id] ?? 'pending') === 'pending').length === 0) setShowSuggestions(false)
    return next
  })
  const dismissSuggestion = (id) => setSuggestionState((prev) => {
    const next = { ...prev, [id]: 'dismissed' }
    if (suggestions.filter((s) => s.id !== id && (next[s.id] ?? 'pending') === 'pending').length === 0) setShowSuggestions(false)
    return next
  })

  const fetchSuggestions = useCallback(async () => {
    try {
      const data = await fetch('/api/agent/suggestions').then((r) => r.json())
      if (data?.suggestions) {
        setSuggestions(data.suggestions)
        setSuggestionState((prev) => {
          const next = { ...prev }
          data.suggestions.forEach((s) => { if (!next[s.id]) next[s.id] = 'pending' })
          return next
        })
      }
    } catch {}
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetch('/api/email/status').then((r) => r.json()),
        fetch('/api/email/recent').then((r) => r.json()),
      ])
      setStatus(s)
      setRecent(r)
    } catch {}
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchSuggestions()
    const id = setInterval(fetchStatus, 5000)
    return () => clearInterval(id)
  }, [fetchStatus, fetchSuggestions])

  const togglePolling = async () => {
    setToggling(true)
    try {
      await fetch(status.polling_active ? '/api/email/stop-polling' : '/api/email/start-polling', { method: 'POST' })
      await fetchStatus()
    } catch {}
    setToggling(false)
  }

  const fmt = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="min-h-full flex flex-col">
      <TopNav title="Live Inbox Monitor" subtitle="Supplier payment inquiry digital worker">
        <span className="text-xs text-slate-400">{status.emails_processed_today} processed today</span>
        <button
          onClick={() => setShowPolicies(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <BookOpen size={14} /> Policies
        </button>
        <button
          onClick={togglePolling}
          disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            status.polling_active
              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              : 'bg-teal-500 text-white hover:bg-teal-600'
          }`}
        >
          {status.polling_active ? <><Square size={14} /> Stop Monitoring</> : <><Play size={14} /> Start Monitoring</>}
        </button>
      </TopNav>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Left — email feed */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.polling_active && <span className="w-2 h-2 rounded-full bg-teal-400 pulse-dot" />}
              <span className="text-xs font-medium text-slate-600">{status.polling_active ? 'Monitoring' : 'Paused'}</span>
            </div>
            <button onClick={fetchStatus} className="text-slate-400 hover:text-slate-600"><RefreshCw size={13} /></button>
          </div>

          {pendingSuggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestions(true)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-violet-50 border-b border-violet-200 hover:bg-violet-100 transition-colors text-left"
            >
              <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                <Lightbulb size={11} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-violet-800">{pendingSuggestions.length} improvement{pendingSuggestions.length > 1 ? 's' : ''} suggested</p>
                <p className="text-xs text-violet-600 truncate">Detected from feedback patterns → Review</p>
              </div>
              <ChevronRight size={13} className="text-violet-400 flex-shrink-0 ml-auto" />
            </button>
          )}

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {recent.length === 0 ? (
              <div className="p-6 text-center">
                <Mail size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No emails processed yet.<br />Start monitoring and send a test email.</p>
              </div>
            ) : (
              recent.map((email) => (
                <button
                  key={email.entry_id}
                  onClick={() => setSelected(email)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors ${selected?.entry_id === email.entry_id ? 'bg-teal-50 border-l-2 border-teal-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-800 truncate">{email.from?.split('<')[0].trim()}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{fmt(email.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-600 truncate mb-2">{email.subject}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge type={INTENT_COLORS[email.intent] || 'general_inquiry'} />
                    <StatusBadge type={email.outcome?.toLowerCase()} />
                    {email.confidence > 0 && <span className="text-xs text-slate-400">{Math.round(email.confidence * 100)}%</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right — step breakdown detail */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {!selected ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Mail size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Select an email to see the agent step breakdown</p>
              </div>
            </div>
          ) : (
            <div className="max-w-xl space-y-4">
              {/* Email header */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Supplier Email</p>
                <p className="text-sm font-semibold text-slate-900 mb-1">{selected.subject}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">From: {selected.from}</p>
                  <p className="text-xs text-slate-400">{selected.timestamp ? new Date(selected.timestamp).toLocaleString() : '—'}</p>
                </div>
                {selected.email_body && (
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 mt-3 font-sans leading-relaxed max-h-36 overflow-y-auto border border-slate-100">
                    {selected.email_body}
                  </pre>
                )}
              </div>

              {/* Step breakdown */}
              <StepBreakdown
                key={selected.entry_id}
                email={selected}
              />
            </div>
          )}
        </div>
      </div>

      {showSuggestions && pendingSuggestions.length > 0 && (
        <SuggestionsModal
          suggestions={pendingSuggestions}
          onApprove={approveSuggestion}
          onDismiss={dismissSuggestion}
          onClose={() => setShowSuggestions(false)}
        />
      )}

      {showPolicies && (
        <PoliciesModal onClose={() => setShowPolicies(false)} />
      )}
    </div>
  )
}
