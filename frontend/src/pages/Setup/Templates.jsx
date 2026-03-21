import { useState } from 'react'
import { Upload, Trash2, FileText, ChevronRight } from 'lucide-react'

const DEFAULT_TEMPLATE = {
  id: 'default-1',
  name: 'Payment Status Response',
  content: `Dear [Supplier Name],

Thank you for reaching out regarding invoice [Invoice Number].

We have reviewed your inquiry and can confirm that payment of [Amount] is [scheduled for / was processed on] [Payment Date] via [Payment Method].

If you have any additional questions or need further details, please don't hesitate to reach out.

Best regards,
Accounts Payable Team`,
}

export default function Templates({ onNext, onBack, onData }) {
  const [templates, setTemplates] = useState([DEFAULT_TEMPLATE])
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
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-teal-600" />
                <span className="text-sm font-medium text-slate-900">{t.name}</span>
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
