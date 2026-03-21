import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import WorkflowMap from './WorkflowMap'
import Participants from './Participants'
import Systems from './Systems'
import Templates from './Templates'
import Policies from './Policies'
import TopNav from '../../components/TopNav'

const STEPS = [
  { id: 'workflow',      label: 'Workflow' },
  { id: 'participants',  label: 'Participants' },
  { id: 'systems',       label: 'Systems' },
  { id: 'templates',     label: 'Templates' },
  { id: 'policies',      label: 'Policies' },
  { id: 'review',        label: 'Review & Launch' },
]

export default function SetupFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [workflowData, setWorkflowData] = useState(null)
  const [participants, setParticipants] = useState([])
  const [policies, setPolicies] = useState([])
  const [templates, setTemplates] = useState([])
  const [launching, setLaunching] = useState(false)
  const navigate = useNavigate()

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0))

  const handleLaunch = () => {
    setLaunching(true)
    setTimeout(() => navigate('/monitor'), 2500)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <WorkflowMap onNext={goNext} onData={setWorkflowData} />
      case 1: return <Participants onNext={goNext} onBack={goBack} workflowData={workflowData} onData={setParticipants} />
      case 2: return <Systems onNext={goNext} onBack={goBack} />
      case 3: return <Templates onNext={goNext} onBack={goBack} onData={setTemplates} />
      case 4: return <Policies onNext={goNext} onBack={goBack} onData={setPolicies} />
      case 5: return (
        <ReviewLaunch
          workflowData={workflowData}
          participants={participants}
          policies={policies}
          templates={templates}
          onBack={goBack}
          onLaunch={handleLaunch}
          launching={launching}
        />
      )
      default: return null
    }
  }

  return (
    <div className="min-h-full">
      <TopNav
        title="Configure Digital Worker"
        subtitle="Supplier Payment Inquiries"
      />
      <div className="flex h-[calc(100vh-73px)]">
        {/* Stepper */}
        <div className="w-52 flex-shrink-0 bg-white border-r border-slate-200 pt-8 px-4">
          <div className="space-y-1">
            {STEPS.map((step, idx) => {
              const done = idx < currentStep
              const active = idx === currentStep
              return (
                <div key={step.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    done    ? 'bg-teal-500 text-white' :
                    active  ? 'bg-navy-900 text-white' :
                              'bg-slate-100 text-slate-400'
                  }`} style={active ? { backgroundColor: '#0f1629' } : {}}>
                    {done ? <Check size={12} /> : idx + 1}
                  </div>
                  <span className={`text-sm ${active ? 'font-semibold text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}

function ReviewLaunch({ workflowData, participants, policies, templates, onBack, onLaunch, launching }) {
  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Review & Launch</h2>
      <p className="text-sm text-slate-500 mb-8">Your digital worker is ready to deploy.</p>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-8">
        <Row label="Workflow steps" value={workflowData?.steps?.length ?? 0} />
        <Row label="Participants" value={participants?.length ?? 0} />
        <Row label="Systems connected" value="ERP (simulated), Gmail" />
        <Row label="Templates loaded" value={templates?.length ?? 0} />
        <Row label="Policies active" value={policies?.length ?? 0} />
        <Row label="Gmail account" value="ruchikumar111982@gmail.com" />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          Back
        </button>
        <button
          onClick={onLaunch}
          disabled={launching}
          className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {launching ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Launching…
            </>
          ) : 'Launch Digital Worker'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center px-5 py-3.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  )
}
