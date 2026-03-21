import { useState, useEffect, useCallback } from 'react'
import { Play, Square, RefreshCw, Mail, ThumbsUp, ThumbsDown } from 'lucide-react'
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

export default function Monitor() {
  const [status, setStatus] = useState({ polling_active: false, last_checked: null, emails_processed_today: 0 })
  const [recent, setRecent] = useState([])
  const [selected, setSelected] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [feedbackState, setFeedbackState] = useState({}) // entry_id -> {submitted, type, showNegForm, note}

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

  const fetchStatus = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetch('/api/email/status').then((res) => res.json()),
        fetch('/api/email/recent').then((res) => res.json()),
      ])
      setStatus(s)
      setRecent(r)
    } catch {}
  }, [])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 5000)
    return () => clearInterval(id)
  }, [fetchStatus])

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
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Original Email</p>
                <p className="text-sm font-semibold text-slate-900 mb-1">{selected.subject}</p>
                <p className="text-xs text-slate-500 mb-3">From: {selected.from}</p>
                <p className="text-xs text-slate-500">{fmtFull(selected.timestamp)}</p>
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
                {selected.invoice_id ? (
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

              {/* Inline feedback */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">AP Clerk Feedback</p>
                {(() => {
                  const fb = feedbackState[selected.entry_id]
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
    </div>
  )
}
