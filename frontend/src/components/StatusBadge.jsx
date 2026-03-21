const variants = {
  live:        'bg-teal-100 text-teal-700 border border-teal-200',
  coming_soon: 'bg-slate-100 text-slate-500 border border-slate-200',
  autonomous:  'bg-teal-100 text-teal-700 border border-teal-200',
  escalated:   'bg-amber-100 text-amber-700 border border-amber-200',
  payment_status:    'bg-blue-100 text-blue-700',
  invoice_approval:  'bg-purple-100 text-purple-700',
  short_pay:         'bg-red-100 text-red-700',
  remittance:        'bg-orange-100 text-orange-700',
  general_inquiry:   'bg-slate-100 text-slate-600',
  out_of_scope:      'bg-gray-100 text-gray-500',
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-green-100 text-green-700',
}

const labels = {
  live: 'LIVE',
  coming_soon: 'COMING SOON',
  autonomous: 'AUTONOMOUS',
  escalated: 'ESCALATED',
  payment_status: 'PAYMENT STATUS',
  invoice_approval: 'INVOICE APPROVAL',
  short_pay: 'SHORT PAY',
  remittance: 'REMITTANCE',
  general_inquiry: 'GENERAL INQUIRY',
  out_of_scope: 'OUT OF SCOPE',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
}

export default function StatusBadge({ type, custom }) {
  const key = type?.toLowerCase().replace(/-/g, '_')
  const cls = variants[key] || 'bg-slate-100 text-slate-600'
  const label = custom || labels[key] || type?.toUpperCase()
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${cls}`}>
      {label}
    </span>
  )
}
