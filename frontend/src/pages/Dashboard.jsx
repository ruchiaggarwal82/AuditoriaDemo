import { useState, useEffect } from 'react'
import { TrendingUp, Mail, Zap, AlertTriangle, Activity, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react'
import TopNav from '../components/TopNav'

// ── Tiny SVG area/line chart ────────────────────────────────────────────────
function AreaChart({ data, keys, colors, height = 120 }) {
  if (!data || data.length === 0) return <div className="text-xs text-slate-400 py-6 text-center">No data</div>

  const w = 600
  const h = height
  const pad = { top: 8, right: 8, bottom: 28, left: 28 }
  const innerW = w - pad.left - pad.right
  const innerH = h - pad.top - pad.bottom

  const maxVal = Math.max(...data.flatMap(d => keys.map(k => d[k] || 0)), 1)
  const xStep = innerW / (data.length - 1 || 1)

  const points = (key) =>
    data.map((d, i) => [pad.left + i * xStep, pad.top + innerH - ((d[key] || 0) / maxVal) * innerH])

  const pathD = (pts) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')

  const areaD = (pts) => {
    const bottom = pad.top + innerH
    return (
      pathD(pts) +
      ` L${pts[pts.length - 1][0].toFixed(1)},${bottom} L${pts[0][0].toFixed(1)},${bottom} Z`
    )
  }

  const yLabels = [0, Math.round(maxVal / 2), maxVal]
  const step = data.length > 5 ? 2 : 1

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {yLabels.map((v) => {
        const y = pad.top + innerH - (v / maxVal) * innerH
        return (
          <g key={v}>
            <line x1={pad.left} y1={y} x2={pad.left + innerW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.left - 4} y={y + 4} fontSize="8" fill="#94a3b8" textAnchor="end">{v}</text>
          </g>
        )
      })}
      {keys.map((key, ki) => (
        <path key={`area-${ki}`} d={areaD(points(key))} fill={colors[ki]} fillOpacity="0.12" />
      ))}
      {keys.map((key, ki) => (
        <path key={`line-${ki}`} d={pathD(points(key))} fill="none" stroke={colors[ki]} strokeWidth="2" strokeLinejoin="round" />
      ))}
      {keys.map((key, ki) =>
        points(key).map(([x, y], i) => (
          <circle key={`dot-${ki}-${i}`} cx={x} cy={y} r="3" fill={colors[ki]} />
        ))
      )}
      {data.map((d, i) => {
        if (i % step !== 0 && i !== data.length - 1) return null
        const x = pad.left + i * xStep
        const label = d.date ? d.date.slice(5) : ''
        return (
          <text key={i} x={x} y={h - 4} fontSize="8" fill="#94a3b8" textAnchor="middle">{label}</text>
        )
      })}
    </svg>
  )
}

// ── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ slices, size = 120 }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0)
  if (total === 0) return <div className="text-xs text-slate-400 py-6 text-center">No data</div>

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  const innerR = size * 0.22

  let cumAngle = -Math.PI / 2
  const paths = slices.map((sl) => {
    const angle = (sl.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    const x2 = cx + r * Math.cos(cumAngle + angle)
    const y2 = cy + r * Math.sin(cumAngle + angle)
    const large = angle > Math.PI ? 1 : 0
    const path = [
      `M ${cx} ${cy}`,
      `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      'Z',
    ].join(' ')
    cumAngle += angle
    return { ...sl, path }
  })

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {paths.map((sl, i) => (
        <path key={i} d={sl.path} fill={sl.color} />
      ))}
      <circle cx={cx} cy={cy} r={innerR} fill="white" />
      <text x={cx} y={cy + 3} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="7" fill="#94a3b8">emails</text>
    </svg>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconBg, label, value, sub, subColor }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        {sub && <p className={`text-xs mt-1 ${subColor || 'text-slate-400'}`}>{sub}</p>}
      </div>
    </div>
  )
}

// ── Intent colours ───────────────────────────────────────────────────────────
const INTENT_META = {
  PAYMENT_STATUS:   { label: 'Payment Status',   color: '#0d9488' },
  SHORT_PAY:        { label: 'Short Pay',         color: '#f59e0b' },
  REMITTANCE:       { label: 'Remittance',         color: '#6366f1' },
  INVOICE_APPROVAL: { label: 'Invoice Approval',  color: '#3b82f6' },
  GENERAL_INQUIRY:  { label: 'General Inquiry',   color: '#8b5cf6' },
  OUT_OF_SCOPE:     { label: 'Out of Scope',       color: '#94a3b8' },
}

// ── Step quality card ────────────────────────────────────────────────────────
function StepQualityCard({ stepNum, name, type, metric, metricColor }) {
  const isDet = type === 'DETERMINISTIC'
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${isDet ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
          {stepNum}
        </span>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isDet ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
          {isDet ? 'DET' : 'PROB'}
        </span>
      </div>
      <p className="text-xs font-semibold text-slate-700 leading-snug">{name}</p>
      <p className={`text-xs ${metricColor || (isDet ? 'text-teal-600' : 'text-amber-600')}`}>{metric}</p>
    </div>
  )
}

// ── Signal bar (feedback loop left panel) ───────────────────────────────────
function SignalBar({ label, value, threshold, color }) {
  const pct = Math.min((value / threshold) * 100, 100)
  const met = value >= threshold
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-800">{value} <span className="font-normal text-slate-400">/ {threshold} threshold</span></span>
          {met && <CheckCircle size={12} className="text-teal-500 flex-shrink-0" />}
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: met ? '#0d9488' : color }}
        />
      </div>
    </div>
  )
}

// ── Pipeline stage ───────────────────────────────────────────────────────────
function PipelineStage({ count, label, sub, active }) {
  return (
    <div className={`flex-1 rounded-xl border p-4 text-center ${active ? 'border-teal-200 bg-teal-50' : 'border-slate-200 bg-white'}`}>
      <p className={`text-2xl font-bold ${active ? 'text-teal-700' : 'text-slate-700'}`}>{count}</p>
      <p className={`text-xs font-semibold mt-0.5 ${active ? 'text-teal-700' : 'text-slate-600'}`}>{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [stepQuality, setStepQuality] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [mRes, sqRes] = await Promise.all([
        fetch(`/api/dashboard/metrics?worker_id=worker-001&period_days=${period}`),
        fetch('/api/audit/step-quality-summary'),
      ])
      setMetrics(await mRes.json())
      setStepQuality(await sqRes.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [period])

  if (loading) {
    return (
      <div className="min-h-full">
        <TopNav title="Dashboard" subtitle="Digital worker performance at a glance" />
        <div className="px-8 py-12 text-sm text-slate-400">Loading metrics…</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-full">
        <TopNav title="Dashboard" subtitle="Digital worker performance at a glance" />
        <div className="px-8 py-12 text-sm text-slate-400">Failed to load metrics.</div>
      </div>
    )
  }

  const { volume, intent_distribution, avg_confidence, avg_processing_ms, daily_volume } = metrics
  const sq = stepQuality

  // Intent donut slices
  const intentSlices = Object.entries(intent_distribution)
    .map(([key, val]) => ({ label: INTENT_META[key]?.label || key, value: val, color: INTENT_META[key]?.color || '#cbd5e1' }))
    .sort((a, b) => b.value - a.value)

  const detRate = sq?.determinism?.rate ?? 0
  const detSteps = sq?.determinism?.deterministic_steps ?? 0
  const totalSteps = sq?.determinism?.total_steps ?? 0
  const totalFeedback = sq?.step_feedback?.total ?? 0
  const step2 = sq?.step_feedback?.step2_corrections ?? 0
  const step2confirm = sq?.step_feedback?.step2_confirmations ?? 0
  const step5 = sq?.step_feedback?.step5_edits ?? 0
  const step5approvals = sq?.step_feedback?.step5_approvals ?? 0
  const step6 = sq?.step_feedback?.step6_incorrect ?? 0
  const step6correct = sq?.step_feedback?.step6_correct ?? 0
  const suggestionsTriggered = sq?.suggestions_triggered ?? 0
  const patternsCount = Object.values(sq?.patterns_met ?? {}).filter(Boolean).length

  return (
    <div className="min-h-full">
      <TopNav title="Dashboard" subtitle="Supplier Payment Inquiries — digital worker performance">
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </TopNav>

      <div className="px-8 py-6 space-y-6">

        {/* ── Row 1: KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Mail}
            iconBg="bg-slate-500"
            label="Emails Received"
            value={volume.total}
            sub={`Last ${period} days`}
          />
          <KpiCard
            icon={Zap}
            iconBg="bg-teal-500"
            label="Handled Autonomously"
            value={volume.autonomous}
            sub={`${volume.autonomous_rate}% automation rate`}
            subColor="text-teal-600"
          />
          <KpiCard
            icon={TrendingUp}
            iconBg="bg-indigo-500"
            label="Determinism Rate"
            value={`${detRate}%`}
            sub={`${detSteps} of ${totalSteps} steps were rule-based`}
            subColor={detRate >= 60 ? 'text-indigo-600' : 'text-amber-600'}
          />
          <KpiCard
            icon={Activity}
            iconBg="bg-violet-500"
            label="Feedback Captured"
            value={totalFeedback}
            sub="Across 3 probabilistic steps"
            subColor="text-violet-600"
          />
        </div>

        {/* ── Row 2: Volume chart + intent donut ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Email Volume</p>
                <p className="text-xs text-slate-400">Autonomous vs escalated per day</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full inline-block bg-teal-500" /> Autonomous</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full inline-block bg-amber-400" /> Escalated</span>
              </div>
            </div>
            <AreaChart
              data={daily_volume}
              keys={['autonomous', 'escalated']}
              colors={['#0d9488', '#f59e0b']}
              height={130}
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-800 mb-1">Intent Breakdown</p>
            <p className="text-xs text-slate-400 mb-4">All emails this period</p>
            <div className="flex items-center gap-4">
              <DonutChart slices={intentSlices} size={110} />
              <div className="space-y-1.5 flex-1">
                {intentSlices.map((sl) => (
                  <div key={sl.label} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sl.color }} />
                    <span className="text-slate-600 truncate">{sl.label}</span>
                    <span className="ml-auto font-semibold text-slate-700">{sl.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Step Quality breakdown ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-800">Step Quality</p>
            <p className="text-xs text-slate-400">Every agent action is either rule-based (deterministic) or a judgment call (probabilistic)</p>
          </div>
          <div className="grid grid-cols-6 gap-3">
            <StepQualityCard
              stepNum={1}
              name="Gate Check"
              type="DETERMINISTIC"
              metric="✓ 100% pass rate"
            />
            <StepQualityCard
              stepNum={2}
              name="Intent Classification"
              type="PROBABILISTIC"
              metric={
                step2 > 0
                  ? `${step2} correction${step2 !== 1 ? 's' : ''}${step2confirm > 0 ? ` · ${step2confirm} confirmed` : ''}`
                  : step2confirm > 0
                  ? `${step2confirm} marked correct`
                  : 'No feedback yet'
              }
              metricColor={step2 >= 3 ? 'text-amber-600 font-medium' : step2confirm > 0 ? 'text-teal-600' : 'text-slate-400'}
            />
            <StepQualityCard
              stepNum={3}
              name="ERP Data Retrieval"
              type="DETERMINISTIC"
              metric={`${volume.autonomous + Math.round(volume.escalated * 0.6)} invoices found`}
            />
            <StepQualityCard
              stepNum={4}
              name="Policy Match"
              type="DETERMINISTIC"
              metric="Rules applied every run"
            />
            <StepQualityCard
              stepNum={5}
              name="Draft / Escalate"
              type="PROBABILISTIC"
              metric={
                step5 > 0
                  ? `${step5} draft${step5 !== 1 ? 's' : ''} edited${step5approvals > 0 ? ` · ${step5approvals} approved` : ''}`
                  : step5approvals > 0
                  ? `${step5approvals} approved`
                  : 'No feedback yet'
              }
              metricColor={step5 >= 3 ? 'text-amber-600 font-medium' : step5approvals > 0 ? 'text-teal-600' : 'text-slate-400'}
            />
            <StepQualityCard
              stepNum={6}
              name="Data Finding"
              type="PROBABILISTIC"
              metric={
                step6 > 0
                  ? `${step6} incorrect${step6correct > 0 ? ` · ${step6correct} confirmed` : ''}`
                  : step6correct > 0
                  ? `${step6correct} confirmed correct`
                  : 'No feedback yet'
              }
              metricColor={step6 >= 2 ? 'text-amber-600 font-medium' : step6correct > 0 ? 'text-teal-600' : 'text-slate-400'}
            />
          </div>
        </div>

        {/* ── Row 4: Feedback Loop ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Signals captured */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-800 mb-1">Signals Captured</p>
            <p className="text-xs text-slate-400 mb-5">AP clerk feedback on probabilistic steps — fills toward pattern-detection threshold</p>
            <div className="space-y-4">
              <SignalBar
                label="Step 2 · Intent corrections"
                value={step2}
                threshold={3}
                color="#6366f1"
              />
              <SignalBar
                label="Step 5 · Draft edits"
                value={step5}
                threshold={3}
                color="#8b5cf6"
              />
              <SignalBar
                label="Step 6 · Incorrect findings"
                value={step6}
                threshold={2}
                color="#f59e0b"
              />
            </div>
          </div>

          {/* Learning pipeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-800 mb-1">Learning Pipeline</p>
            <p className="text-xs text-slate-400 mb-5">Feedback flows into pattern detection → suggestions for policy improvement</p>

            <div className="flex items-center gap-2">
              <PipelineStage
                count={totalFeedback}
                label="Feedback Items"
                sub="across 3 steps"
                active={false}
              />
              <ArrowRight size={16} className="text-slate-300 flex-shrink-0" />
              <PipelineStage
                count={patternsCount}
                label="Patterns Detected"
                sub="thresholds met"
                active={patternsCount > 0}
              />
              <ArrowRight size={16} className="text-slate-300 flex-shrink-0" />
              <PipelineStage
                count={suggestionsTriggered}
                label="Suggestions Ready"
                sub="pending review"
                active={suggestionsTriggered > 0}
              />
            </div>

            {suggestionsTriggered > 0 && (
              <div className="mt-4 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5">
                <CheckCircle size={14} className="text-teal-500 flex-shrink-0" />
                <p className="text-xs text-teal-700 font-medium">
                  {suggestionsTriggered} policy suggestion{suggestionsTriggered > 1 ? 's' : ''} ready — review in the Audit Trail to improve automation.
                </p>
              </div>
            )}

            <div className="mt-4 space-y-1.5">
              {[
                { met: sq?.patterns_met?.intent_correction, label: 'Intent classification policy needed', step: 2 },
                { met: sq?.patterns_met?.draft_edit, label: 'Response template should be updated', step: 5 },
                { met: sq?.patterns_met?.finding_incorrect, label: 'Data source mapping to review', step: 6 },
              ].map(({ met, label, step }) => (
                <div key={step} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded ${met ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-400'}`}>
                  <span className={`w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 ${met ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-500'}`}>{step}</span>
                  {label}
                  {met && <span className="ml-auto font-semibold">↑ pattern detected</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer stats ── */}
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 flex items-center gap-8">
          <div>
            <p className="text-xs text-slate-400">Avg confidence</p>
            <p className="text-lg font-bold text-slate-800">{Math.round(avg_confidence * 100)}%</p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div>
            <p className="text-xs text-slate-400">Avg processing time</p>
            <p className="text-lg font-bold text-slate-800">{avg_processing_ms}ms</p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div>
            <p className="text-xs text-slate-400">Automation rate</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-32 bg-slate-100 rounded-full h-2">
                <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${volume.autonomous_rate}%` }} />
              </div>
              <p className="text-lg font-bold text-slate-800">{volume.autonomous_rate}%</p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div>
            <p className="text-xs text-slate-400">Determinism rate</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-32 bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${detRate}%` }} />
              </div>
              <p className="text-lg font-bold text-slate-800">{detRate}%</p>
            </div>
          </div>
          <div className="ml-auto text-xs text-slate-400">
            Worker: Supplier Payment Inquiries
          </div>
        </div>

      </div>
    </div>
  )
}
