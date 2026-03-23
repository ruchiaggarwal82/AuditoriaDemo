import { useState, useEffect, useCallback } from 'react'
import { Play, Square, RefreshCw, Mail, ThumbsUp, ThumbsDown, Send, Check, Lightbulb, X, ChevronRight, ShieldCheck } from 'lucide-react'
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


// Policy-mandated escalations never benefit from feedback
function isPolicyMandated(email) {
  const reason = (email.escalation_reason || '').toLowerCase()
  const status = (email.erp_detail?.status || '')
  return status === 'on_hold' || reason.includes('on hold') || reason.includes('on_hold')
}

// ── Suggestions modal ───────────────────────────────────────────────────────
function SuggestionsModal({ suggestions, onApprove, onDismiss, onClose }) {
  const [active, setActive] = useState(suggestions[0]?.id)
  const current = suggestions.find((s) => s.id === active) || suggestions[0]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
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

        {/* Tabs */}
        {suggestions.length > 1 && (
          <div className="flex border-b border-slate-100 px-6 gap-4 overflow-x-auto">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active === s.id ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {s.title.split(' ').slice(0, 5).join(' ')}…
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">{current.title}</h3>
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

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={() => onDismiss(current.id)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Dismiss suggestion
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Review later
            </button>
            <button
              onClick={() => onApprove(current.id)}
              className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Approve & activate <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Monitor() {
  const [status, setStatus] = useState({ polling_active: false, last_checked: null, emails_processed_today: 0 })
  const [recent, setRecent] = useState([])
  const [selected, setSelected] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [feedbackState, setFeedbackState] = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [suggestionState, setSuggestionState] = useState({}) // pending | approved | dismissed
  const [showSuggestions, setShowSuggestions] = useState(false)

  const pendingSuggestions = suggestions.filter((s) => (suggestionState[s.id] ?? 'pending') === 'pending')

  const approveSuggestion = (id) => {
    setSuggestionState((prev) => {
      const next = { ...prev, [id]: 'approved' }
      const stillPending = suggestions.filter((s) => s.id !== id && (next[s.id] ?? 'pending') === 'pending')
      if (stillPending.length === 0) setShowSuggestions(false)
      return next
    })
  }
  const dismissSuggestion = (id) => {
    setSuggestionState((prev) => {
      const next = { ...prev, [id]: 'dismissed' }
      const stillPending = suggestions.filter((s) => s.id !== id && (next[s.id] ?? 'pending') === 'pending')
      if (stillPending.length === 0) setShowSuggestions(false)
      return next
    })
  }

  const submitFeedback = async (entry_id, feedback, note = '') => {
    await fetch('/api/audit/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id, feedback, note }),
    })
    setFeedbackState((prev) => ({ ...prev, [entry_id]: { submitted: true, type: feedback, note } }))
  }

  const submitEscalationFeedback = async (entry_id, escalation_feedback, note = '') => {
    await fetch('/api/audit/escalation-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id, escalation_feedback, escalation_feedback_note: note }),
    })
    setFeedbackState((prev) => ({ ...prev, [entry_id]: { submitted: true, type: escalation_feedback, note } }))
  }

  const approveAndSend = async (entry_id) => {
    setFeedbackState((prev) => ({ ...prev, [entry_id]: { submitting: true } }))
    try {
      await fetch('/api/email/approve-and-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id }),
      })
      setFeedbackState((prev) => ({ ...prev, [entry_id]: { submitted: true, type: 'approved' } }))
      fetchStatus()
    } catch {
      setFeedbackState((prev) => ({ ...prev, [entry_id]: {} }))
    }
  }

  const fetchSuggestions = useCallback(async () => {
    try {
      const data = await fetch('/api/agent/suggestions').then((res) => res.json())
      if (data?.suggestions) {
        setSuggestions(data.suggestions)
        setSuggestionState((prev) => {
          const next = { ...prev }
          data.suggestions.forEach((s) => {
            if (!next[s.id]) next[s.id] = 'pending'
          })
          return next
        })
      }
    } catch {}
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetch('/api/email/status').then((res) => res.json()),
        fetch('/api/email/recent').then((res) => res.json()),
      ])
      setStatus(s)
      setRecent(r)
      // Seed feedbackState from persisted audit data
      setFeedbackState((prev) => {
        const next = { ...prev }
        r.forEach((email) => {
          if (!next[email.entry_id]?.submitted) {
            const fb = email.escalation_feedback || email.feedback
            if (fb) {
              next[email.entry_id] = { submitted: true, type: fb }
            }
          }
        })
        return next
      })
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
    const endpoint = status.polling_active ? '/api/email/stop-polling' : '/api/email/start-polling'
    try {
      await fetch(endpoint, { method: 'POST' })
      await fetchStatus()
    } catch {}
    setToggling(false)
  }

  const fmt = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
  const fmtFull = (ts) => ts ? new Date(ts).toLocaleString() : '—'

  return (
    <div className="min-h-full flex flex-col">
      <TopNav title="Live Inbox Monitor" subtitle="Supplier payment inquiry digital worker">
        <span className="text-xs text-slate-400">
          {status.emails_processed_today} processed today
        </span>
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
              {status.polling_active && (
                <span className="w-2 h-2 rounded-full bg-teal-400 pulse-dot" />
              )}
              <span className="text-xs font-medium text-slate-600">
                {status.polling_active ? 'Monitoring' : 'Paused'}
              </span>
            </div>
            <button onClick={fetchStatus} className="text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Suggestions notification strip */}
          {pendingSuggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestions(true)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-violet-50 border-b border-violet-200 hover:bg-violet-100 transition-colors text-left"
            >
              <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                <Lightbulb size={11} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-violet-800">
                  {pendingSuggestions.length} improvement{pendingSuggestions.length > 1 ? 's' : ''} suggested
                </p>
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
                    {email.confidence > 0 && (
                      <span className="text-xs text-slate-400">{Math.round(email.confidence * 100)}%</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right — detail */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {!selected ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Mail size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Select an email to see details</p>
              </div>
            </div>
          ) : (
            <div className="max-w-xl space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Supplier Email</p>
                <p className="text-sm font-semibold text-slate-900 mb-1">{selected.subject}</p>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-500">From: {selected.from}</p>
                  <p className="text-xs text-slate-400">{fmtFull(selected.timestamp)}</p>
                </div>
                {selected.email_body && (
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 font-sans leading-relaxed max-h-48 overflow-y-auto border border-slate-100">
                    {selected.email_body}
                  </pre>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Classification</p>
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge type={INTENT_COLORS[selected.intent] || 'general_inquiry'} />
                  <span className="text-xs text-slate-500">Confidence</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-teal-500 h-1.5 rounded-full"
                      style={{ width: `${Math.round((selected.confidence || 0) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{Math.round((selected.confidence || 0) * 100)}%</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">ERP Data</p>
                {selected.erp_detail ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                      <span className="text-sm text-slate-800 font-medium">{selected.erp_detail.invoice_id} found in ERP</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <span className="text-slate-400">Supplier</span>
                      <span className="text-slate-800 font-medium">{selected.erp_detail.supplier_name}</span>
                      <span className="text-slate-400">Invoice amount</span>
                      <span className="text-slate-800 font-medium">${selected.erp_detail.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span className="text-slate-400">Status</span>
                      <span className="text-amber-600 font-medium capitalize">{selected.erp_detail.status?.replace('_', ' ')}</span>
                      {selected.erp_detail.payment_date && (
                        <>
                          <span className="text-slate-400">Payment date</span>
                          <span className="text-slate-800 font-medium">{selected.erp_detail.payment_date}</span>
                        </>
                      )}
                    </div>
                    {selected.erp_detail.notes && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                        {selected.erp_detail.notes}
                      </div>
                    )}
                  </div>
                ) : selected.invoice_id ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="text-sm text-slate-800 font-medium">{selected.invoice_id} found in ERP</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm text-slate-500">Not found in ERP</span>
                  </div>
                )}
              </div>

              {/* Agent reply — autonomous responses */}
              {selected.outcome === 'AUTONOMOUS' && selected.reply_body && (
                <div className="bg-teal-50 rounded-xl border border-teal-200 p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Agent Response Sent</p>
                    <span className="text-xs text-teal-600 font-medium bg-teal-100 px-2 py-0.5 rounded-full">Auto-sent ✓</span>
                  </div>
                  <p className="text-xs font-medium text-teal-800 mb-2">{selected.reply_subject}</p>
                  <pre className="text-xs text-teal-900 whitespace-pre-wrap bg-white/70 rounded-lg p-3 font-sans leading-relaxed max-h-48 overflow-y-auto border border-teal-100">
                    {selected.reply_body}
                  </pre>
                </div>
              )}

              {/* Draft response (SHORT_PAY escalations only) */}
              {selected.draft_response?.body && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">AI-Drafted Response</p>
                  <p className="text-xs text-slate-400 mb-3">Pending AP clerk approval before sending</p>
                  <p className="text-xs font-medium text-slate-700 mb-2">{selected.draft_response.subject}</p>
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 font-sans leading-relaxed max-h-48 overflow-y-auto border border-slate-100">
                    {selected.draft_response.body}
                  </pre>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Outcome</p>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge type={selected.outcome?.toLowerCase()} />
                </div>
                {selected.escalation_reason && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                    {selected.escalation_reason}
                  </p>
                )}
              </div>

              {/* Inline feedback / approval */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  {selected.intent === 'SHORT_PAY' && selected.outcome === 'ESCALATED' ? 'AP Clerk Approval' : 'AP Clerk Feedback'}
                </p>
                {(() => {
                  const fb = feedbackState[selected.entry_id]
                  const isApproved = selected.approved || fb?.type === 'approved'

                  // Policy-mandated escalations — no feedback needed
                  if (selected.outcome === 'ESCALATED' && isPolicyMandated(selected) && selected.intent !== 'SHORT_PAY') {
                    return (
                      <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                        <ShieldCheck size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-slate-600">Policy escalation — no feedback needed</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            On-hold invoices always escalate per policy. This is correct by definition — feedback on these escalations isn't tracked.
                          </p>
                        </div>
                      </div>
                    )
                  }

                  // SHORT_PAY escalation — show approve flow
                  if (selected.intent === 'SHORT_PAY' && selected.outcome === 'ESCALATED') {
                    if (isApproved) {
                      return (
                        <div className="flex items-center gap-2 text-teal-700 text-xs font-medium bg-teal-50 px-3 py-2 rounded-lg">
                          <Check size={14} /> Response sent to supplier
                        </div>
                      )
                    }
                    return (
                      <div>
                        <p className="text-xs text-slate-500 mb-3">
                          Review the AI-drafted response above and approve to send to the supplier.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveAndSend(selected.entry_id)}
                            disabled={fb?.submitting}
                            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                          >
                            {fb?.submitting
                              ? <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
                              : <><Send size={12} /> Approve &amp; Send to Supplier</>}
                          </button>
                        </div>
                      </div>
                    )
                  }

                  if (fb?.submitted) {
                    return (
                      <p className={`text-xs font-medium px-3 py-2 rounded-lg ${
                        fb.type === 'positive' || fb.type === 'justified'
                          ? 'bg-teal-50 text-teal-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        Feedback recorded — thank you!
                      </p>
                    )
                  }

                  if (selected.outcome === 'ESCALATED') {
                    return (
                      <div>
                        <p className="text-xs text-slate-500 mb-3">Was this escalation correct?</p>
                        {fb?.showNegForm ? (
                          <div className="space-y-2">
                            <input
                              value={fb.note || ''}
                              onChange={(ev) => setFeedbackState((p) => ({ ...p, [selected.entry_id]: { ...p[selected.entry_id], note: ev.target.value } }))}
                              placeholder="What should the digital worker have done instead?"
                              className="w-full text-xs border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => submitEscalationFeedback(selected.entry_id, 'should_have_automated', fb.note || '')}
                                className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600"
                              >Submit</button>
                              <button
                                onClick={() => setFeedbackState((p) => ({ ...p, [selected.entry_id]: { ...p[selected.entry_id], showNegForm: false } }))}
                                className="px-3 py-1.5 text-slate-500 text-xs border border-slate-200 rounded-lg"
                              >Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => submitEscalationFeedback(selected.entry_id, 'justified')}
                              className="text-xs px-3 py-1.5 rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50 transition-colors"
                            >✓ Escalation justified</button>
                            <button
                              onClick={() => setFeedbackState((p) => ({ ...p, [selected.entry_id]: { showNegForm: true } }))}
                              className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors"
                            >✗ Shouldn't have escalated</button>
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Autonomous — response quality
                  return (
                    <div>
                      <p className="text-xs text-slate-500 mb-3">How was the automated response?</p>
                      {fb?.showNegForm ? (
                        <div className="space-y-2">
                          <input
                            value={fb.note || ''}
                            onChange={(ev) => setFeedbackState((p) => ({ ...p, [selected.entry_id]: { ...p[selected.entry_id], note: ev.target.value } }))}
                            placeholder="What was wrong with the response?"
                            className="w-full text-xs border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => submitFeedback(selected.entry_id, 'negative', fb.note || '')}
                              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                            >Submit</button>
                            <button
                              onClick={() => setFeedbackState((p) => ({ ...p, [selected.entry_id]: { ...p[selected.entry_id], showNegForm: false } }))}
                              className="px-3 py-1.5 text-slate-500 text-xs border border-slate-200 rounded-lg"
                            >Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => submitFeedback(selected.entry_id, 'positive')}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50 transition-colors"
                          ><ThumbsUp size={12} /> Looks good</button>
                          <button
                            onClick={() => setFeedbackState((p) => ({ ...p, [selected.entry_id]: { showNegForm: true } }))}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          ><ThumbsDown size={12} /> Issue with response</button>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions modal */}
      {showSuggestions && pendingSuggestions.length > 0 && (
        <SuggestionsModal
          suggestions={pendingSuggestions}
          onApprove={approveSuggestion}
          onDismiss={dismissSuggestion}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </div>
  )
}
