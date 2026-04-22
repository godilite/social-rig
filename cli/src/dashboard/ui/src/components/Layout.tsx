import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, FileText, Calendar, Settings, Plug, FolderOpen, Menu, X } from "lucide-react"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/drafts", icon: FileText, label: "Drafts" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/projects", icon: FolderOpen, label: "Projects" },
  { to: "/plugins", icon: Plug, label: "Connectors" },
  { to: "/config", icon: Settings, label: "Config" },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="layout">
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h1>social-rig</h1>
          <span>Marketing Dashboard</span>
        </div>
        <nav>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
