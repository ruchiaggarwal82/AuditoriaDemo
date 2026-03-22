import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, ArrowRight, RotateCcw, Database } from 'lucide-react'
import TopNav from '../components/TopNav'
import StatusBadge from '../components/StatusBadge'

const workers = [
  {
    id: 'supplier-payment',
    name: 'Supplier Payment Inquiries',
    description: 'Automatically handles supplier questions about payment status, invoice approvals, and remittance details.',
    status: 'live',
    active: true,
  },
  {
    id: 'collections',
    name: 'Collections & Dunning',
    description: 'Automates outbound payment reminders and escalations for overdue customer accounts.',
    status: 'coming_soon',
    active: false,
  },
  {
    id: 'vendor-onboarding',
    name: 'Vendor Onboarding',
    description: 'Guides new vendors through registration, document submission, and compliance checks.',
    status: 'coming_soon',
    active: false,
  },
  {
    id: 'invoice-exception',
    name: 'Invoice Exception Handling',
    description: 'Identifies and resolves 3-way match discrepancies, duplicate invoices, and coding errors.',
    status: 'coming_soon',
    active: false,
  },
  {
    id: 'gl-close',
    name: 'GL Close Assistant',
    description: 'Coordinates month-end close tasks, accruals, and reconciliation across the finance team.',
    status: 'coming_soon',
    active: false,
  },
  {
    id: 'spend-analytics',
    name: 'Spend Analytics',
    description: 'Monitors spend patterns, flags anomalies, and surfaces savings opportunities in real time.',
    status: 'coming_soon',
    active: false,
  },
]

function DemoControls() {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(null) // 'fresh' | 'restore' | null

  useEffect(() => {
    fetch('/api/demo/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [])

  const reset = async (mode) => {
    setLoading(mode)
    if (mode === 'fresh') localStorage.removeItem('dw-worker-live')
    try {
      await fetch(`/api/demo/reset?mode=${mode}`, { method: 'POST' })
      // Inject fresh demo emails into the monitored inbox
      fetch('/api/demo/inject-demo-emails', { method: 'POST' }).catch(() => {})
      // Refresh status
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
          <button
            onClick={() => reset('fresh')}
            disabled={!!loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={14} className={loading === 'fresh' ? 'animate-spin' : ''} />
            Fresh Start
          </button>
          <button
            onClick={() => reset('restore')}
            disabled={!!loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <Database size={14} className={loading === 'restore' ? 'animate-spin' : ''} />
            Restore Sample Data
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

export default function Discover() {
  const navigate = useNavigate()

  return (
    <div className="min-h-full">
      <TopNav
        title="Digital Workers"
        subtitle="Deploy AI teammates across your finance workflows"
      />
      <div className="px-8 py-8">
        <div className="grid grid-cols-3 gap-5">
          {workers.map((w) => (
            <div
              key={w.id}
              className={`bg-white rounded-xl border p-6 flex flex-col transition-shadow ${
                w.active
                  ? 'border-teal-200 shadow-sm hover:shadow-md cursor-pointer'
                  : 'border-slate-200 opacity-70'
              }`}
              onClick={() => w.active && navigate('/setup')}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Bot size={20} className={w.active ? 'text-teal-600' : 'text-slate-400'} />
                </div>
                <StatusBadge type={w.status} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{w.name}</h3>
              <p className="text-sm text-slate-500 flex-1 leading-relaxed">{w.description}</p>
              <div className="mt-5">
                {w.active ? (
                  <button
                    onClick={() => navigate('/setup')}
                    className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    Configure <ArrowRight size={14} />
                  </button>
                ) : (
                  <span className="text-sm text-slate-400">Coming soon</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <DemoControls />
      </div>
    </div>
  )
}
