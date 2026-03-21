import { useNavigate } from 'react-router-dom'
import { Bot, ArrowRight } from 'lucide-react'
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
      </div>
    </div>
  )
}
