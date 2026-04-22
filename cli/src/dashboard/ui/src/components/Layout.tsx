import { useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Settings,
  Plug,
  FolderOpen,
  Menu,
  X,
  Zap,
} from "lucide-react"
import { cn } from "../lib/utils"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/drafts", icon: FileText, label: "Drafts" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/projects", icon: FolderOpen, label: "Projects" },
  { to: "/plugins", icon: Plug, label: "Connectors" },
  { to: "/config", icon: Settings, label: "Settings" },
]

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/drafts": "Drafts",
  "/calendar": "Calendar",
  "/projects": "Projects",
  "/plugins": "Connectors",
  "/config": "Settings",
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const pageTitle = pageTitles[location.pathname] ?? "Dashboard"

  return (
    <div className="flex min-h-screen w-full bg-slate-900">
      <button
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-slate-900 transition-transform duration-200 md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 px-6 pt-7 pb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-white">social-rig</h1>
            <p className="text-[11px] font-medium text-slate-500">Marketing Engine</p>
          </div>
        </div>

        <div className="mx-4 mb-4 h-px bg-slate-800" />

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-indigo-500/15 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                )
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} strokeWidth={isActive(to, location.pathname) ? 2.5 : 2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mx-4 mt-auto mb-2 h-px bg-slate-800" />

        <div className="px-5 pb-6 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-[11px] font-bold text-white">
              SR
            </div>
            <div>
              <p className="text-[12px] font-medium text-slate-300">social-rig</p>
              <p className="text-[11px] text-slate-500">v0.1.0</p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-6 pt-6 pl-6">
        <div className="flex items-center gap-4 pl-2 pr-8 md:pl-4">
          <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>
        </div>

        <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-tl-[48px] bg-white">
          <div className="mx-auto max-w-[1280px] p-8 md:p-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function isActive(to: string, pathname: string): boolean {
  if (to === "/") return pathname === "/"
  return pathname.startsWith(to)
}
