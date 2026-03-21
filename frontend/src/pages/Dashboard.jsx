import { useState, useEffect } from 'react'
import { TrendingUp, Mail, Zap, AlertTriangle, ThumbsUp, BarChart2, RefreshCw } from 'lucide-react'
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

  // Y-axis labels (0, mid, max)
  const yLabels = [0, Math.round(maxVal / 2), maxVal]
  // X-axis: show every other label if too many
  const step = data.length > 5 ? 2 : 1

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {/* Y gridlines */}
      {yLabels.map((v) => {
        const y = pad.top + innerH - (v / maxVal) * innerH
        return (
          <g key={v}>
            <line x1={pad.left} y1={y} x2={pad.left + innerW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.left - 4} y={y + 4} fontSize="8" fill="#94a3b8" textAnchor="end">{v}</text>
          </g>
        )
      })}

      {/* Area fills */}
      {keys.map((key, ki) => (
        <path key={`area-${ki}`} d={areaD(points(key))} fill={colors[ki]} fillOpacity="0.12" />
      ))}

      {/* Lines */}
      {keys.map((key, ki) => (
        <path key={`line-${ki}`} d={pathD(points(key))} fill="none" stroke={colors[ki]} strokeWidth="2" strokeLinejoin="round" />
      ))}

      {/* Dots */}
      {keys.map((key, ki) =>
        points(key).map(([x, y], i) => (
          <circle key={`dot-${ki}-${i}`} cx={x} cy={y} r="3" fill={colors[ki]} />
        ))
      )}

      {/* X labels */}
      {data.map((d, i) => {
        if (i % step !== 0 && i !== data.length - 1) return null
        const x = pad.left + i * xStep
        const label = d.date ? d.date.slice(5) : '' // "MM-DD"
        return (
          <text key={i} x={x} y={h - 4} fontSize="8" fill="#94a3b8" textAnchor="middle">{label}</text>
        )
      })}
    </svg>
  )
}

// ── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ slices, size = 120 }) {
  // slices: [{label, value, color}]
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
      {/* Inner hole */}
      <circle cx={cx} cy={cy} r={innerR} fill="white" />
      {/* Center total */}
      <text x={cx} y={cy + 3} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="7" fill="#94a3b8">emails</text>
    </svg>
  )
}

// ── Horizontal bar ───────────────────────────────────────────────────────────
function HBar({ label, value, max, color, subtext }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-36 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-6 text-right">{value}</span>
      {subtext && <span className="text-xs text-slate-400 w-16">{subtext}</span>}
    </div>
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

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/metrics?worker_id=worker-001&period_days=${period}`)
      setMetrics(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchMetrics() }, [period])

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

  const { volume, response_quality, escalation_quality, intent_distribution, avg_confidence, avg_processing_ms, daily_volume } = metrics

  // Intent donut slices
  const intentSlices = Object.entries(intent_distribution)
    .map(([key, val]) => ({ label: INTENT_META[key]?.label || key, value: val, color: INTENT_META[key]?.color || '#cbd5e1' }))
    .sort((a, b) => b.value - a.value)

  // Negative feedback reasons
  const negReasons = Object.entries(response_quality.negative_reasons || {}).sort((a, b) => b[1] - a[1])
  const maxNegReason = negReasons.length > 0 ? Math.max(...negReasons.map(([, v]) => v)) : 1

  // Escalation reasons
  const escReasons = Object.entries(escalation_quality.by_reason || {}).sort((a, b) => b[1] - a[1])
  const maxEscReason = escReasons.length > 0 ? Math.max(...escReasons.map(([, v]) => v)) : 1

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
          <button onClick={fetchMetrics} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </TopNav>

      <div className="px-8 py-6 space-y-6">

        {/* ── KPI row ── */}
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
            icon={AlertTriangle}
            iconBg="bg-amber-500"
            label="Escalated to AP Clerk"
            value={volume.escalated}
            sub={`${(100 - volume.autonomous_rate).toFixed(1)}% of total`}
            subColor="text-amber-600"
          />
          <KpiCard
            icon={ThumbsUp}
            iconBg="bg-indigo-500"
            label="Response Quality"
            value={response_quality.quality_rate != null ? `${response_quality.quality_rate}%` : '—'}
            sub={response_quality.quality_rate != null
              ? `${response_quality.positive} positive · ${response_quality.negative} negative`
              : 'No feedback yet'}
            subColor={response_quality.quality_rate != null && response_quality.quality_rate >= 80 ? 'text-teal-600' : 'text-red-500'}
          />
        </div>

        {/* ── Second row: volume chart + intent donut ── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Volume chart */}
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

          {/* Intent donut */}
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

        {/* ── Third row: quality panels ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Response quality */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-slate-800">Response Quality</p>
              {response_quality.quality_rate != null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${response_quality.quality_rate >= 80 ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'}`}>
                  {response_quality.quality_rate}% positive
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-4">AP clerk feedback on autonomous responses</p>

            {/* Feedback summary bars */}
            <div className="space-y-2 mb-5">
              <HBar label="👍 Positive feedback" value={response_quality.positive} max={volume.autonomous} color="#0d9488" />
              <HBar label="👎 Negative feedback" value={response_quality.negative} max={volume.autonomous} color="#ef4444" />
              <HBar label="No feedback yet" value={response_quality.no_feedback} max={volume.autonomous} color="#e2e8f0" />
            </div>

            {negReasons.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Issues reported</p>
                <div className="space-y-2">
                  {negReasons.map(([reason, count]) => (
                    <HBar key={reason} label={reason} value={count} max={maxNegReason} color="#f87171" />
                  ))}
                </div>
              </>
            )}

            {negReasons.length === 0 && response_quality.negative === 0 && (
              <p className="text-xs text-teal-600 bg-teal-50 rounded-lg px-3 py-2">No negative feedback received — great work!</p>
            )}
          </div>

          {/* Escalation quality */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-slate-800">Escalation Quality</p>
              {escalation_quality.quality_rate != null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${escalation_quality.quality_rate >= 70 ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                  {escalation_quality.quality_rate}% justified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-4">AP clerk feedback on escalated emails</p>

            {/* Escalation quality bars */}
            <div className="space-y-2 mb-5">
              <HBar label="✓ Escalation justified" value={escalation_quality.justified} max={volume.escalated} color="#0d9488" />
              <HBar label="✗ Could have been automated" value={escalation_quality.should_have_automated} max={volume.escalated} color="#f59e0b"
                subtext={escalation_quality.should_have_automated > 0 ? `${escalation_quality.should_have_automated} to review` : undefined}
              />
              <HBar label="No feedback yet" value={escalation_quality.no_feedback} max={volume.escalated} color="#e2e8f0" />
            </div>

            {escReasons.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Escalation reasons</p>
                <div className="space-y-2">
                  {escReasons.map(([reason, count]) => (
                    <HBar key={reason} label={reason} value={count} max={maxEscReason} color="#fbbf24" />
                  ))}
                </div>
              </>
            )}

            {escalation_quality.should_have_automated > 0 && (
              <div className="mt-4 bg-amber-50 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">Learning opportunity</p>
                <p className="text-xs text-amber-600">
                  {escalation_quality.should_have_automated} escalation{escalation_quality.should_have_automated > 1 ? 's were' : ' was'} flagged as unnecessary.
                  Review the Audit Trail for AP clerk notes on what the digital worker should have done instead.
                </p>
              </div>
            )}
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
          <div className="ml-auto text-xs text-slate-400">
            Worker: Supplier Payment Inquiries
          </div>
        </div>

      </div>
    </div>
  )
}
