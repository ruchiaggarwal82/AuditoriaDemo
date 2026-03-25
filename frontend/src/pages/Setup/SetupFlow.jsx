import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Activity, Pencil } from 'lucide-react'
import WorkflowMap from './WorkflowMap'
import Participants from './Participants'
import Systems from './Systems'
import Templates from './Templates'
import Policies from './Policies'
import TopNav from '../../components/TopNav'

const STEPS = [
  { id: 'workflow',   label: 'Workflow' },
  { id: 'systems',    label: 'Systems' },
  { id: 'policies',   label: 'Policies' },
  { id: 'templates',  label: 'Templates' },
  { id: 'review',     label: 'Review & Launch' },
]

export default function SetupFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [workflowData, setWorkflowData] = useState(null)
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [participants, setParticipants] = useState([])
  const [policies, setPolicies] = useState([])
  const [templates, setTemplates] = useState([])
  const [fieldMap, setFieldMap] = useState([])
  const [launching, setLaunching] = useState(false)
  const [alreadyLive, setAlreadyLive] = useState(false)
  const navigate = useNavigate()

  // Load existing worker config on mount — skip to Review if already configured.
  // Three signals: localStorage flag (set on Launch), worker API, monitoring active.
  useEffect(() => {
    const isLive = localStorage.getItem('dw-worker-live') === 'true'

    Promise.all([
      fetch('/api/workflow/workers').then((r) => r.json()).catch(() => []),
      fetch('/api/email/status').then((r) => r.json()).catch(() => ({ polling_active: false })),
      fetch('/api/workflow/field-map/worker-001').then((r) => r.json()).catch(() => ({ field_map: [] })),
    ]).then(([workers, emailStatus, fmData]) => {
      const worker = workers.find((w) => w.worker_id === 'worker-001')
      const hasConfig = worker?.workflow_steps?.length > 0

      if (hasConfig || isLive || emailStatus.polling_active) {
        if (worker) {
          setWorkflowData({
            workflow_name: worker.workflow_name || 'Supplier Payment Inquiry Handling',
            steps: worker.workflow_steps || [],
            gaps_identified: worker.gaps_identified || [],
          })
          setParticipants(worker.participants || [])
          setPolicies(worker.policies || [])
          setTemplates(worker.templates || [])
        }
        setFieldMap(fmData.field_map || [])
        setAlreadyLive(true)
        setCurrentStep(4)
      }
    })
  }, [])

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0))

  const handleLaunch = async () => {
    setLaunching(true)
    const WORKER_ID = 'worker-001'
    try {
      await Promise.all([
        fetch('/api/workflow/save-workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            worker_id: WORKER_ID,
            workflow_name: workflowData?.workflow_name || 'Supplier Payment Inquiry Handling',
            steps: workflowData?.steps || [],
            gaps_identified: workflowData?.gaps_identified || [],
          }),
        }),
        fetch('/api/workflow/save-participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worker_id: WORKER_ID, participants }),
        }),
        fetch('/api/workflow/save-policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worker_id: WORKER_ID, policies }),
        }),
        fetch('/api/workflow/save-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worker_id: WORKER_ID, templates }),
        }),
      ])
    } catch (e) {
      console.error('Failed to save worker config:', e)
    }
    localStorage.setItem('dw-worker-live', 'true')
    setTimeout(() => navigate('/monitor'), 2500)
  }

  const renderStep = () => {
    // When the worker is live, show read-only summaries for all non-review steps
    if (alreadyLive && currentStep < 4) {
      return (
        <ReadOnlyStep
          step={currentStep}
          workflowData={workflowData}
          fieldMap={fieldMap}
          policies={policies}
          templates={templates}
          onBack={() => setCurrentStep(4)}
        />
      )
    }
    switch (currentStep) {
      case 0: return <WorkflowMap onNext={goNext} onData={setWorkflowData} onDescription={setWorkflowDescription} initialDescription={workflowDescription} initialResult={workflowData} />
      case 1: return <Systems onNext={goNext} onBack={goBack} onData={setFieldMap} />
      case 2: return <Policies onNext={goNext} onBack={goBack} onData={setPolicies} workflowDescription={workflowDescription} fieldMap={fieldMap} />
      case 3: return <Templates onNext={goNext} onBack={goBack} onData={setTemplates} />
      case 4: return (
        <ReviewLaunch
          workflowData={workflowData}
          participants={participants}
          policies={policies}
          templates={templates}
          onBack={goBack}
          onLaunch={handleLaunch}
          launching={launching}
          alreadyLive={alreadyLive}
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
              const clickable = done || active
              return (
                <button
                  key={step.id}
                  onClick={() => clickable && setCurrentStep(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    clickable ? 'hover:bg-slate-100 cursor-pointer' : 'cursor-default'
                  } ${active ? 'bg-slate-100' : ''}`}
                >
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
                </button>
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

// ── Read-only step view (when worker is already live) ────────────────────────
function ReadOnlyStep({ step, workflowData, fieldMap, policies, templates, onBack }) {
  const STEP_TITLES = ['Workflow', 'Systems', 'Policies', 'Templates']

  const renderContent = () => {
    if (step === 0) {
      // Workflow
      const steps = workflowData?.steps || []
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Workflow name</p>
            <p className="text-sm font-semibold text-slate-800">{workflowData?.workflow_name || '—'}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Steps ({steps.length})</p>
            {steps.length === 0 ? <p className="text-sm text-slate-400">No steps recorded.</p> : (
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div>
                      <p className="font-medium text-slate-800">{s.name || s}</p>
                      {s.description && <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {workflowData?.gaps_identified?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-xs text-amber-600 uppercase tracking-wide mb-2">Gaps identified</p>
              <div className="space-y-1">
                {workflowData.gaps_identified.map((g, i) => (
                  <p key={i} className="text-sm text-amber-800">• {g}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (step === 1) {
      // Systems / Field Map
      return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">ERP Field Mapping</p>
            <p className="text-xs text-slate-400 mt-0.5">Workday — {fieldMap.length} fields mapped</p>
          </div>
          {fieldMap.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">No field map saved.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {fieldMap.map((f) => (
                <div key={f.field} className="grid grid-cols-3 gap-3 px-5 py-2.5 text-xs">
                  <span className="font-mono text-teal-700">{f.field}</span>
                  <span className="font-mono text-slate-400">{f.erp_path}</span>
                  <span className="text-slate-600">{f.sample_value ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (step === 2) {
      // Policies
      return (
        <div className="space-y-3">
          {policies.length === 0 ? (
            <p className="text-sm text-slate-400">No policies configured.</p>
          ) : policies.map((p) => (
            <div key={p.policy_id} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-400">{p.policy_id}</span>
                <span className="text-sm font-semibold text-slate-800">{p.policy_name || p.title}</span>
                <span className="ml-auto text-xs px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded font-medium">DETERMINISTIC</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{p.trigger || p.description}</p>
            </div>
          ))}
        </div>
      )
    }

    if (step === 3) {
      // Templates
      return (
        <div className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-slate-400">No templates configured.</p>
          ) : templates.map((t, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold text-slate-800 mb-1">{t.name || t.title || `Template ${i + 1}`}</p>
              {t.content && <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{t.content}</pre>}
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-semibold text-slate-900">{STEP_TITLES[step]}</h2>
        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">Read-only</span>
      </div>
      {renderContent()}
      <button
        onClick={onBack}
        className="mt-6 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
      >
        ← Back to overview
      </button>
    </div>
  )
}

function ReviewLaunch({ workflowData, participants, policies, templates, onBack, onLaunch, launching, alreadyLive }) {
  const navigate = useNavigate()
  return (
    <div className="p-8 max-w-2xl">
      {alreadyLive && (
        <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-6">
          <div className="flex items-center gap-2.5">
            <Activity size={16} className="text-teal-600 flex-shrink-0" />
            <span className="text-sm font-medium text-teal-800">Worker is live and monitoring your inbox</span>
          </div>
          <button
            disabled
            title="Edit configuration (coming soon)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 border border-slate-200 rounded-lg bg-white cursor-not-allowed opacity-60"
          >
            <Pencil size={12} /> Edit
          </button>
        </div>
      )}
      <h2 className="text-lg font-semibold text-slate-900 mb-1">
        {alreadyLive ? 'Worker Configuration' : 'Review & Launch'}
      </h2>
      <p className="text-sm text-slate-500 mb-8">
        {alreadyLive ? 'Your digital worker is deployed and running.' : 'Your digital worker is ready to deploy.'}
      </p>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-8">
        <Row label="Workflow steps" value={workflowData?.steps?.length ?? 0} />
        <Row label="Systems connected" value="ERP (simulated), Gmail" />
        <Row label="Templates loaded" value={templates?.length ?? 0} />
        <Row label="Policies active" value={policies?.length ?? 0} />
        <Row label="Gmail account" value="ruchikumar111982@gmail.com" />
      </div>

      <div className="flex gap-3">
        {!alreadyLive && (
          <button onClick={onBack} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            Back
          </button>
        )}
        {alreadyLive ? (
          <button
            onClick={() => navigate('/monitor')}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Activity size={15} /> Go to Live Monitor
          </button>
        ) : (
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
        )}
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
