import { CheckCircle, ChevronRight, Database, Mail, MessageSquare, Landmark, MessageCircle, Users } from 'lucide-react'

export default function Systems({ onNext, onBack }) {
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
          status="simulated"
          statusLabel="Simulated"
          note="Using sample invoice data for demo"
        />

        {/* Bank Feed */}
        <SystemCard
          icon={<Landmark size={18} className="text-emerald-600" />}
          title="Bank Feed"
          subtitle="Real-time payment confirmations & remittance data"
          status="simulated"
          statusLabel="Simulated"
          note="Using sample bank transaction data for demo"
        />

        {/* Gmail */}
        <SystemCard
          icon={<Mail size={18} className="text-blue-600" />}
          title="Email — Gmail"
          subtitle="ruchikumar111982@gmail.com"
          status="connected"
          statusLabel="Connected"
        />

        {/* Slack */}
        <SystemCard
          icon={<MessageSquare size={18} className="text-purple-600" />}
          title="Slack"
          subtitle="auditoria-demo.slack.com — #ap-escalations"
          status="connected"
          statusLabel="Webhook configured"
        />

        {/* SMS / WhatsApp */}
        <SystemCard
          icon={<MessageCircle size={18} className="text-green-600" />}
          title="SMS / WhatsApp"
          subtitle="Send payment alerts and escalation nudges via text"
          status="available"
          actionLabel="Connect"
        />
      </div>

      {/* Custom systems CTA */}
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
        <button onClick={onNext} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors">
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
