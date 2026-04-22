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
    <div className="flex min-h-screen w-full bg-[#0d1117]">
      <button
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-md bg-[#0969da] text-white md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#0d1117] transition-transform duration-200 md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 px-6 pt-7 pb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#f0f6fc]">
            <Zap size={18} className="text-[#0d1117]" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-[#f0f6fc]">social-rig</h1>
            <p className="text-[11px] font-medium text-[#8b949e]">Marketing Engine</p>
          </div>
        </div>

        <div className="mx-4 mb-4 h-px bg-[#21262d]" />

        <nav className="flex-1 space-y-0.5 px-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-[#161b22] text-[#f0f6fc]"
                    : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]",
                )
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mx-4 mt-auto mb-2 h-px bg-[#21262d]" />

        <div className="px-5 pb-6 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#21262d] text-[11px] font-bold text-[#8b949e]">
              SR
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#c9d1d9]">social-rig</p>
              <p className="text-[11px] text-[#484f58]">v0.1.0</p>
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
          <h1 className="text-base font-semibold text-[#c9d1d9]">{pageTitle}</h1>
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
