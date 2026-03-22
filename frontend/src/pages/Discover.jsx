import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, ArrowRight, RotateCcw, Database, X, Check, ChevronRight, Sparkles, MessageSquare } from 'lucide-react'
import TopNav from '../components/TopNav'
import StatusBadge from '../components/StatusBadge'

const workers = [
  {
    id: 'supplier-payment',
    name: 'Supplier Payment Inquiries',
    description: 'Automatically handles supplier questions about payment status, invoice approvals, and remittance details.',
    status: 'live',
    active: true,
    highlights: [
      'Classifies email intent in under 2 seconds',
      'Looks up invoices directly in your ERP',
      'Auto-responds with payment details when confidence >85%',
      'Escalates high-value or complex cases to AP Manager',
      'Full audit trail for every interaction',
    ],
    metrics: [
      { label: 'Inquiries handled autonomously', value: '~85%' },
      { label: 'Avg. response time', value: '<2 min' },
      { label: 'AP team time saved', value: '3–4 hrs/day' },
    ],
  },
  {
    id: 'collections',
    name: 'Collections & Dunning',
    description: 'Automates outbound payment reminders and escalations for overdue customer accounts.',
    status: 'coming_soon',
    active: false,
    bullets: [
      'Send tiered payment reminders at configurable intervals',
      'Escalate to account managers for high-risk accounts',
      'Auto-pause dunning for accounts in active dispute',
      'Generate aging reports and prioritise outreach',
    ],
  },
  {
    id: 'vendor-onboarding',
    name: 'Vendor Onboarding',
    description: 'Guides new vendors through registration, document submission, and compliance checks.',
    status: 'coming_soon',
    active: false,
    bullets: [
      'Walk vendors through document submission step by step',
      'Verify tax IDs, bank details, and compliance requirements',
      'Auto-approve standard vendors, flag exceptions for review',
      'Send status update emails at each onboarding milestone',
    ],
  },
  {
    id: 'invoice-exception',
    name: 'Invoice Exception Handling',
    description: 'Identifies and resolves 3-way match discrepancies, duplicate invoices, and coding errors.',
    status: 'coming_soon',
    active: false,
    bullets: [
      'Detect 3-way match failures and route to the right approver',
      'Flag duplicate invoices before payment runs',
      'Suggest corrections using historical resolution data',
      'Track exception resolution time by type and vendor',
    ],
  },
  {
    id: 'gl-close',
    name: 'GL Close Assistant',
    description: 'Coordinates month-end close tasks, accruals, and reconciliation across the finance team.',
    status: 'coming_soon',
    active: false,
    bullets: [
      'Coordinate close checklists across the finance team',
      'Remind task owners of pending accruals and reconciliations',
      'Flag anomalies in journal entries before posting',
      'Generate live close status dashboards for controllers',
    ],
  },
  {
    id: 'spend-analytics',
    name: 'Spend Analytics',
    description: 'Monitors spend patterns, flags anomalies, and surfaces savings opportunities in real time.',
    status: 'coming_soon',
    active: false,
    bullets: [
      'Monitor spend by category, vendor, and cost centre',
      'Flag anomalies and policy violations in real time',
      'Surface savings opportunities using historical benchmarks',
      'Generate executive spend summaries on demand',
    ],
  },
]

// ── Supplier Payment "Learn More" modal ────────────────────────────────────
function SupplierLearnMoreModal({ onClose, onConfigure }) {
  return (
    <ModalShell onClose={onClose} wide>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
          <Bot size={20} className="text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Supplier Payment Inquiries</h2>
          <span className="text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">Live</span>
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        Finance teams spend hours every week answering the same supplier questions — "When is my invoice getting paid?",
        "Was my invoice received?", "Can you send the remittance?" This digital worker handles all of that autonomously,
        24/7, in under 2 minutes per email.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {workers[0].metrics.map((m) => (
          <div key={m.label} className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-teal-700 mb-1">{m.value}</p>
            <p className="text-xs text-teal-600 leading-snug">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">How it works</p>
        <div className="space-y-2">
          {[
            { step: '1', text: 'Monitors your AP inbox and picks up new supplier emails' },
            { step: '2', text: 'Classifies intent — payment status, invoice approval, remittance, or short pay' },
            { step: '3', text: 'Looks up the invoice in your ERP using the invoice or PO number' },
            { step: '4', text: 'Auto-responds with payment details when confidence is high (>85%)' },
            { step: '5', text: 'Escalates complex or high-value cases to your AP team via Slack' },
            { step: '6', text: 'Logs every action to a full audit trail' },
          ].map((item) => (
            <div key={item.step} className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-xs font-bold text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">{item.step}</span>
              <p className="text-sm text-slate-700">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Key capabilities</p>
        <div className="grid grid-cols-2 gap-2">
          {workers[0].highlights.map((h) => (
            <div key={h} className="flex gap-2 items-start">
              <Check size={13} className="text-teal-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">{h}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          Close
        </button>
        <button
          onClick={onConfigure}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Configure this worker <ChevronRight size={15} />
        </button>
      </div>
    </ModalShell>
  )
}

// ── Coming-soon "Learn More" modal ─────────────────────────────────────────
function ComingSoonModal({ worker, interested, onInterest, onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Bot size={20} className="text-slate-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{worker.name}</h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Coming soon</span>
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed mb-6">{worker.description}</p>

      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">What it will do</p>
        <div className="space-y-2">
          {worker.bullets?.map((b) => (
            <div key={b} className="flex gap-2 items-start">
              <Sparkles size={12} className="text-violet-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">{b}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        {interested ? (
          <div className="flex items-center gap-2 text-sm text-teal-700 font-medium bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
            <Check size={15} /> You're on the early access list — we'll reach out soon!
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Close
            </button>
            <button
              onClick={onInterest}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              I'm interested — add me to early access
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

// ── "Tell us" modal ────────────────────────────────────────────────────────
function TellUsModal({ onClose }) {
  const [submitted, setSubmitted] = useState(false)
  const [text, setText] = useState('')

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
          <MessageSquare size={20} className="text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Request a Digital Worker</h2>
          <p className="text-xs text-slate-500">Help us build what your team actually needs</p>
        </div>
      </div>

      {submitted ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
            <Check size={22} className="text-teal-600" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">Thanks! We've got your request.</p>
          <p className="text-sm text-slate-500">Our team will reach out within 2 business days to learn more.</p>
          <button onClick={onClose} className="mt-6 px-5 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            Close
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Tell us about the finance workflow you'd like to automate. Our team reviews every request and will follow up to explore how we can help.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. We spend a lot of time chasing approvals for purchase orders over $10k. Would love a digital worker that can track these and nudge approvers automatically…"
            rows={5}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none mb-4"
          />
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={() => setSubmitted(true)}
              disabled={!text.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40"
            >
              Send request <ChevronRight size={15} />
            </button>
          </div>
        </>
      )}
    </ModalShell>
  )
}

// ── Shared modal shell ─────────────────────────────────────────────────────
function ModalShell({ children, onClose, wide }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full overflow-y-auto max-h-[90vh] ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Demo controls ──────────────────────────────────────────────────────────
function DemoControls() {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(null)

  useEffect(() => {
    fetch('/api/demo/status').then((r) => r.json()).then(setStatus).catch(() => {})
  }, [])

  const reset = async (mode) => {
    setLoading(mode)
    if (mode === 'fresh') localStorage.removeItem('dw-worker-live')
    try {
      await fetch(`/api/demo/reset?mode=${mode}`, { method: 'POST' })
      fetch('/api/demo/inject-demo-emails', { method: 'POST' }).catch(() => {})
      const s = await fetch('/api/demo/status').then((r) => r.json())
      setStatus(s)
      if (mode === 'fresh') navigate('/setup')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="mt-10 border border-amber-200 bg-amber-50 rounded-xl px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Demo Controls</p>
          <p className="text-sm text-amber-800">
            {status
              ? status.worker_configured
                ? `Worker is configured · ${status.audit_entries} audit entries`
                : `Worker not configured · ${status.audit_entries} audit entries`
              : 'Loading status…'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => reset('fresh')} disabled={!!loading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50">
            <RotateCcw size={14} className={loading === 'fresh' ? 'animate-spin' : ''} /> Fresh Start
          </button>
          <button onClick={() => reset('restore')} disabled={!!loading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50">
            <Database size={14} className={loading === 'restore' ? 'animate-spin' : ''} /> Restore Sample Data
          </button>
        </div>
      </div>
      <p className="text-xs text-amber-600 mt-2">
        <strong>Fresh Start</strong> → clears everything and opens setup wizard from step 1 &nbsp;·&nbsp;
        <strong>Restore Sample Data</strong> → reloads 30-entry audit log + configured worker for dashboard/feedback demo
      </p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Discover() {
  const navigate = useNavigate()
  const [learnMore, setLearnMore] = useState(null)       // worker id
  const [interested, setInterested] = useState({})       // { workerId: true }
  const [showTellUs, setShowTellUs] = useState(false)

  const activeWorker = workers[0]

  return (
    <div className="min-h-full">
      <TopNav title="Digital Workers" subtitle="Deploy AI teammates across your finance workflows" />

      <div className="px-8 py-8">
        <div className="grid grid-cols-3 gap-5">
          {workers.map((w) => (
            <div
              key={w.id}
              className={`bg-white rounded-xl border p-6 flex flex-col transition-shadow ${
                w.active ? 'border-teal-200 shadow-sm hover:shadow-md' : 'border-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Bot size={20} className={w.active ? 'text-teal-600' : 'text-slate-400'} />
                </div>
                <StatusBadge type={w.status} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{w.name}</h3>
              <p className="text-sm text-slate-500 flex-1 leading-relaxed mb-5">{w.description}</p>

              {w.active ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/setup')}
                    className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    Configure <ArrowRight size={14} />
                  </button>
                  <span className="text-slate-200">|</span>
                  <button
                    onClick={() => setLearnMore(w.id)}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Learn more
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setLearnMore(w.id)}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Learn more
                  </button>
                  <span className="text-slate-200">|</span>
                  {interested[w.id] ? (
                    <span className="flex items-center gap-1 text-xs text-teal-600 font-medium">
                      <Check size={12} /> Interested
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setInterested((prev) => ({ ...prev, [w.id]: true }))
                        setLearnMore(w.id)
                      }}
                      className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      <Sparkles size={13} /> I'm interested
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* "Tell us" CTA */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowTellUs(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-violet-600 hover:text-violet-700 border border-dashed border-violet-300 hover:border-violet-400 rounded-xl transition-colors bg-violet-50 hover:bg-violet-100"
          >
            <MessageSquare size={15} />
            Don't see the digital worker you need? Tell us about it →
          </button>
        </div>

        <div className="mt-16">
          <DemoControls />
        </div>
      </div>

      {/* Modals */}
      {learnMore === activeWorker.id && (
        <SupplierLearnMoreModal
          onClose={() => setLearnMore(null)}
          onConfigure={() => { setLearnMore(null); navigate('/setup') }}
        />
      )}
      {learnMore && learnMore !== activeWorker.id && (() => {
        const w = workers.find((x) => x.id === learnMore)
        return w ? (
          <ComingSoonModal
            worker={w}
            interested={!!interested[w.id]}
            onInterest={() => setInterested((prev) => ({ ...prev, [w.id]: true }))}
            onClose={() => setLearnMore(null)}
          />
        ) : null
      })()}
      {showTellUs && <TellUsModal onClose={() => setShowTellUs(false)} />}
    </div>
  )
}
