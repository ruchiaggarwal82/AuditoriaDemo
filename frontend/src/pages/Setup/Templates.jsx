import { useState } from 'react'
import { Upload, Trash2, FileText, ChevronRight } from 'lucide-react'

const DEFAULT_TEMPLATES = [
  {
    id: 'tmpl-001',
    name: 'Payment Status — Autonomous',
    tag: 'Autonomous',
    content: `Dear [Supplier Name],

Thank you for reaching out regarding invoice [Invoice Number].

We can confirm that payment of [Amount] is scheduled for [Payment Date] via [Payment Method] (Ref: [Reference Number]). Please allow 1–2 business days for the funds to reflect in your account.

If you have any further questions, don't hesitate to reach out.

Best regards,
Accounts Payable Team — Sookti.ai`,
  },
  {
    id: 'tmpl-002',
    name: 'Invoice Approval Confirmation — Autonomous',
    tag: 'Autonomous',
    content: `Dear [Supplier Name],

Thank you for following up on invoice [Invoice Number].

We can confirm your invoice has been received and is currently [approved and queued for payment / under review with our finance team]. You can expect payment by [Expected Date].

We appreciate your patience and will notify you of any updates.

Warm regards,
Accounts Payable Team — Sookti.ai`,
  },
  {
    id: 'tmpl-003',
    name: 'Short Payment Explanation — Agent Drafted',
    tag: 'Agent drafted',
    content: `Dear [Supplier Name],

Thank you for reaching out regarding the payment for invoice [Invoice Number].

We acknowledge that a payment of [Amount Paid] was made against the invoiced amount of [Invoice Amount]. Our team is reviewing the discrepancy related to [brief reason, e.g. contract terms / PO adjustment / deduction policy] and will provide a full breakdown within 2 business days.

We appreciate your patience and will be in touch shortly.

Best regards,
Accounts Payable Team — Sookti.ai`,
  },
  {
    id: 'tmpl-004',
    name: 'After-Hours Acknowledgment — Autonomous',
    tag: 'Autonomous',
    content: `Dear [Supplier Name],

Thank you for contacting Sookti.ai Accounts Payable regarding invoice [Invoice Number].

We have received your message and will respond during our business hours (Monday–Friday, 9am–6pm IST). You can expect a response by the next business day.

Thank you for your patience.

Best regards,
Accounts Payable Team — Sookti.ai`,
  },
]

export default function Templates({ onNext, onBack, onData }) {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteName, setPasteName] = useState('')
  const [pasteContent, setPasteContent] = useState('')

  const addPasted = () => {
    if (!pasteName.trim() || !pasteContent.trim()) return
    const t = { id: crypto.randomUUID(), name: pasteName, content: pasteContent }
    setTemplates((prev) => [...prev, t])
    setPasteName('')
    setPasteContent('')
    setPasteMode(false)
  }

  const remove = (id) => setTemplates((prev) => prev.filter((t) => t.id !== id))

  const handleContinue = () => {
    onData?.(templates)
    onNext()
  }

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Response Templates</h2>
      <p className="text-sm text-slate-500 mb-6">
        Templates help the digital worker maintain your company's tone and format.
      </p>

      <div className="space-y-3 mb-4">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText size={16} className="text-teal-600 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-900">{t.name}</span>
                {t.tag && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    t.tag === 'Autonomous'
                      ? 'bg-teal-50 text-teal-600 border border-teal-200'
                      : 'bg-violet-50 text-violet-600 border border-violet-200'
                  }`}>{t.tag}</span>
                )}
              </div>
              <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
            <pre className="text-xs text-slate-500 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 font-sans leading-relaxed max-h-40 overflow-y-auto">
              {t.content}
            </pre>
          </div>
        ))}
      </div>

      {pasteMode ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <input
            value={pasteName}
            onChange={(e) => setPasteName(e.target.value)}
            placeholder="Template name"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <textarea
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder="Paste your template here…"
            rows={6}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex gap-2 mt-3">
            <button onClick={addPasted} className="px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600">Add</button>
            <button onClick={() => setPasteMode(false)} className="px-4 py-2 text-slate-500 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setPasteMode(true)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-xl px-5 py-4 w-full transition-colors mb-8"
        >
          <Upload size={16} /> Paste or add a template
        </button>
      )}

      <div className="flex gap-3 mt-4">
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
