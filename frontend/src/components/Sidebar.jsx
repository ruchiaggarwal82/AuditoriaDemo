import { NavLink, useLocation } from 'react-router-dom'
import { LayoutGrid, Settings, Activity, ClipboardList, Zap, BarChart2 } from 'lucide-react'

const navItems = [
  { to: '/discover',   icon: LayoutGrid,   label: 'Discover' },
  { to: '/dashboard',  icon: BarChart2,    label: 'Dashboard' },
  { to: '/setup',      icon: Settings,     label: 'Setup' },
  { to: '/monitor',    icon: Activity,     label: 'Monitor' },
  { to: '/audit',      icon: ClipboardList, label: 'Audit Trail' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-56 flex-shrink-0 bg-navy-900 flex flex-col h-full"
      style={{ backgroundColor: '#0f1629' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="text-white font-semibold text-base tracking-tight">Acme Corp</span>
        </div>
        <p className="text-slate-400 text-xs mt-1 ml-9">Digital Finance Team</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to)
          const isMonitor = to === '/monitor'
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="relative">
                <Icon size={16} />
                {isMonitor && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-teal-400 pulse-dot" />
                )}
              </div>
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/10">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 w-full transition-colors">
          <Settings size={16} />
          Settings
        </button>
        <div className="mt-3 px-3">
          <div className="text-xs text-slate-600">v0.1.0 — Demo</div>
        </div>
      </div>
    </aside>
  )
}
