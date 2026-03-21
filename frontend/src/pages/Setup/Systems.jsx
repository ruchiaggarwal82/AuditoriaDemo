import { useState } from 'react'
import { CheckCircle, Circle, ChevronRight, Database, Mail, MessageSquare, Plus } from 'lucide-react'

export default function Systems({ onNext, onBack }) {
  const [gmailStatus] = useState('connected')  // assume connected for demo
  const [slackStatus] = useState('configured')
  const [customEndpoint, setCustomEndpoint] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Connect your data sources</h2>
      <p className="text-sm text-slate-500 mb-6">
        The digital worker's response quality depends on the data it can reach.
      </p>

      <div className="space-y-3 mb-6">
        {/* ERP */}
        <SystemCard
          icon={<Database size={18} className="text-teal-600" />}
          title="ERP System"
          subtitle="Workday / Oracle / SAP / NetSuite"
          status="connected"
          statusLabel="Simulated"
          note="Using sample invoice data for demo"
        />

        {/* Gmail */}
        <SystemCard
          icon={<Mail size={18} className="text-blue-600" />}
          title="Email — Gmail"
          subtitle="ruchikumar111982@gmail.com"
          status={gmailStatus}
          statusLabel="Connected"
          actionLabel={gmailStatus !== 'connected' ? 'Connect Gmail' : null}
        />

        {/* Slack */}
        <SystemCard
          icon={<MessageSquare size={18} className="text-purple-600" />}
          title="Slack"
          subtitle="auditoria-demo.slack.com — #ap-escalations"
          status={slackStatus}
          statusLabel="Webhook configured"
          actionLabel={slackStatus !== 'configured' ? 'Configure Slack' : null}
        />

        {/* Custom */}
        {showCustom ? (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-900 mb-3">Custom / Homegrown System</p>
            <input
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="https://your-api.example.com/invoices"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-xl px-5 py-4 w-full transition-colors"
          >
            <Plus size={16} /> Add custom data source
          </button>
        )}
      </div>

      <div className="bg-slate-100 rounded-lg px-4 py-3 text-xs text-slate-500 mb-8">
        ⚠️ Unconnected systems will result in escalation to your team instead of an autonomous response.
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          Back
        </button>
        <button onClick={onNext} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors">
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function SystemCard({ icon, title, subtitle, status, statusLabel, actionLabel, note }) {
  const isConnected = status === 'connected' || status === 'configured'
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between">
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
      <div className="flex items-center gap-2 ml-4">
        {isConnected ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
            <CheckCircle size={11} /> {statusLabel}
          </span>
        ) : (
          <button className="text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 px-3 py-1.5 rounded-lg transition-colors">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
