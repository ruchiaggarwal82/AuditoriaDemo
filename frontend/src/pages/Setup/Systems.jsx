import { useState, useEffect } from 'react'
import { CheckCircle, ChevronRight, Database, Mail, MessageSquare, Landmark, MessageCircle, Users, Pencil, Check } from 'lucide-react'

const DEFAULT_FIELD_MAP = [
  { field: 'vendor.email',             path: 'invoices[].supplier_email',          sample: 'ap@acmesupplies.com' },
  { field: 'vendor.name',              path: 'invoices[].supplier_name',           sample: 'Acme Supplies Co' },
  { field: 'invoice.id',               path: 'invoices[].invoice_id',              sample: 'INV-2024-1042' },
  { field: 'invoice.amount',           path: 'invoices[].amount',                  sample: '12500.00' },
  { field: 'invoice.currency',         path: 'invoices[].currency',                sample: 'USD' },
  { field: 'invoice.status',           path: 'invoices[].status',                  sample: 'scheduled' },
  { field: 'invoice.hold_status',      path: 'invoices[].status == "on_hold"',     sample: 'false' },
  { field: 'invoice.hold_reason',      path: 'invoices[].notes',                   sample: '' },
  { field: 'invoice.due_date',         path: 'invoices[].due_date',                sample: '2024-03-25' },
  { field: 'invoice.payment_date',     path: 'invoices[].payment_date',            sample: '2024-03-28' },
  { field: 'invoice.po_number',        path: 'invoices[].po_number',               sample: 'PO-8821' },
  { field: 'payment.bank_feed_status', path: 'invoices[].payment_method',          sample: 'ACH' },
]

export default function Systems({ onNext, onBack, onData }) {
  const [fieldMap, setFieldMap] = useState(DEFAULT_FIELD_MAP)
  const [editingRow, setEditingRow] = useState(null)
  const [editPath, setEditPath] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/workflow/field-map/worker-001')
      .then((r) => r.json())
      .then((data) => {
        if (data.field_map?.length) {
          setFieldMap(data.field_map)
          setConfirmed(data.confirmed)
        }
      })
      .catch(() => {})
  }, [])

  const startEdit = (idx) => {
    setEditingRow(idx)
    setEditPath(fieldMap[idx].path)
  }

  const commitEdit = (idx) => {
    const next = fieldMap.map((row, i) => i === idx ? { ...row, path: editPath } : row)
    setFieldMap(next)
    setEditingRow(null)
    setConfirmed(false)
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await fetch('/api/workflow/save-field-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: 'worker-001', field_map: fieldMap }),
      })
      setConfirmed(true)
      onData?.(fieldMap)
    } catch {}
    setSaving(false)
  }

  const handleContinue = async () => {
    if (!confirmed) await handleConfirm()
    onNext()
  }

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Connect your data sources</h2>
      <p className="text-sm text-slate-500 mb-6">
        The digital worker's response quality depends on the data it can reach.
      </p>

      <div className="space-y-3 mb-6">
        <SystemCard
          icon={<Database size={18} className="text-teal-600" />}
          title="ERP System"
          subtitle="Workday / Oracle / SAP / NetSuite"
          status="simulated"
          statusLabel="Simulated"
          note="Using sample invoice data for demo"
        />

        {/* Field mapping section — shown below ERP card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">ERP Field Mapping</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-populated for Workday. Edit any path to match your ERP schema.
              </p>
            </div>
            {confirmed && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
                <Check size={11} /> Confirmed
              </span>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 w-44">Field</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Mapped ERP path</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 w-36">Sample value</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fieldMap.map((row, idx) => (
                  <tr key={row.field} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-teal-700 font-medium">{row.field}</td>
                    <td className="px-3 py-2">
                      {editingRow === idx ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={editPath}
                            onChange={(e) => setEditPath(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && commitEdit(idx)}
                            className="flex-1 font-mono text-xs border border-teal-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                          <button
                            onClick={() => commitEdit(idx)}
                            className="text-teal-600 hover:text-teal-700"
                          >
                            <Check size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-slate-600">{row.path}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-400 font-mono">
                      {row.sample || <span className="italic text-slate-300">—</span>}
                    </td>
                    <td className="px-2 py-2">
                      {editingRow !== idx && (
                        <button
                          onClick={() => startEdit(idx)}
                          className="text-slate-300 hover:text-slate-500 transition-colors"
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleConfirm}
              disabled={saving || confirmed}
              className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors ${
                confirmed
                  ? 'bg-teal-50 text-teal-600 border border-teal-200 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50'
              }`}
            >
              {saving ? 'Saving…' : confirmed ? '✓ Mapping confirmed' : 'Confirm field mapping'}
            </button>
          </div>
        </div>

        <SystemCard
          icon={<Landmark size={18} className="text-emerald-600" />}
          title="Bank Feed"
          subtitle="Real-time payment confirmations & remittance data"
          status="simulated"
          statusLabel="Simulated"
          note="Using sample bank transaction data for demo"
        />

        <SystemCard
          icon={<Mail size={18} className="text-blue-600" />}
          title="Email — Gmail"
          subtitle="ruchikumar111982@gmail.com"
          status="connected"
          statusLabel="Connected"
        />

        <SystemCard
          icon={<MessageSquare size={18} className="text-purple-600" />}
          title="Slack"
          subtitle="auditoria-demo.slack.com — #ap-escalations"
          status="connected"
          statusLabel="Webhook configured"
        />

        <SystemCard
          icon={<MessageCircle size={18} className="text-green-600" />}
          title="SMS / WhatsApp"
          subtitle="Send payment alerts and escalation nudges via text"
          status="available"
          actionLabel="Connect"
        />
      </div>

      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 mb-6">
        <Users size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-700">Got custom or homegrown systems?</p>
          <p className="text-xs text-slate-500 mt-0.5">
            We can connect to any internal API or database.{' '}
            <span className="text-teal-600 font-medium cursor-default">Talk to our team →</span>
          </p>
        </div>
      </div>

      <div className="bg-slate-100 rounded-lg px-4 py-3 text-xs text-slate-500 mb-8">
        ⚠️ Unconnected systems will result in escalation to your team instead of an autonomous response.
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          Back
        </button>
        <button onClick={handleContinue} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors">
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function SystemCard({ icon, title, subtitle, status, statusLabel, actionLabel, note }) {
  const isConnected = status === 'connected' || status === 'simulated'
  const badgeStyle =
    status === 'simulated'
      ? 'text-violet-600 bg-violet-50 border-violet-200'
      : status === 'connected'
      ? 'text-teal-600 bg-teal-50 border-teal-200'
      : ''

  return (
    <div className={`bg-white rounded-xl border p-5 flex items-start justify-between ${status === 'available' ? 'border-dashed border-slate-200' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          {note && <p className="text-xs text-slate-400 mt-0.5 italic">{note}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        {isConnected ? (
          <span className={`flex items-center gap-1.5 text-xs font-medium border px-2.5 py-1 rounded-full ${badgeStyle}`}>
            <CheckCircle size={11} /> {statusLabel}
          </span>
        ) : (
          <button
            disabled
            className="text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg cursor-not-allowed"
            title="Coming soon"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
