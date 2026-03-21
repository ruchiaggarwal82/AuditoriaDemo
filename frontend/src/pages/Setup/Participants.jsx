import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronRight } from 'lucide-react'

const REACH_OPTIONS = ['Email', 'Slack', 'Portal', 'System automated']
const TIMEOUT_OPTIONS = ['1 hour', '4 hours', '1 business day', 'None']

function buildParticipants(workflowData) {
  if (!workflowData?.steps) return []
  const seen = new Set()
  const participants = []
  for (const step of workflowData.steps) {
    const role = step.who_is_involved
    if (role && !seen.has(role)) {
      seen.add(role)
      participants.push({
        id: crypto.randomUUID(),
        role,
        reach: step.how_they_are_reached ?? 'Email',
        description: step.what_action_is_expected ?? '',
        escalation_timeout: '1 business day',
      })
    }
  }
  return participants
}

export default function Participants({ onNext, onBack, workflowData, onData }) {
  const [rows, setRows] = useState(() => buildParticipants(workflowData))

  useEffect(() => {
    if (workflowData && rows.length === 0) {
      setRows(buildParticipants(workflowData))
    }
  }, [workflowData])

  const update = (id, field, value) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r))
  }

  const addRow = () => {
    setRows((prev) => [...prev, {
      id: crypto.randomUUID(),
      role: '',
      reach: 'Email',
      description: '',
      escalation_timeout: '1 business day',
    }])
  }

  const remove = (id) => setRows((prev) => prev.filter((r) => r.id !== id))

  const handleContinue = () => {
    onData?.(rows)
    onNext()
  }

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Participants</h2>
      <p className="text-sm text-slate-500 mb-6">
        Define who is involved at each step and how the digital worker will reach them.
      </p>

      {rows.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 mb-4">
          No workflow data yet — you can add participants manually or go back and map your workflow first.
        </div>
      )}

      <div className="space-y-3 mb-4">
        {rows.map((row) => (
          <div key={row.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Role</label>
                <input
                  value={row.role}
                  onChange={(e) => update(row.id, 'role', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. AP Manager"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">How they're reached</label>
                <select
                  value={row.reach}
                  onChange={(e) => update(row.id, 'reach', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {REACH_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1 block">What the digital worker does at this step</label>
                <input
                  value={row.description}
                  onChange={(e) => update(row.id, 'description', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Sends payment status reply autonomously"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Escalation timeout</label>
                <select
                  value={row.escalation_timeout}
                  onChange={(e) => update(row.id, 'escalation_timeout', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {TIMEOUT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex items-end justify-end">
                <button onClick={() => remove(row.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addRow} className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium mb-8">
        <Plus size={16} /> Add participant
      </button>

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
