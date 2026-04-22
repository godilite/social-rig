import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import Home from "./pages/Home"
import Drafts from "./pages/Drafts"
import CalendarPage from "./pages/Calendar"
import Config from "./pages/Config"
import Plugins from "./pages/Plugins"
import Projects from "./pages/Projects"

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/drafts" element={<Drafts />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/config" element={<Config />} />
        <Route path="/plugins" element={<Plugins />} />
        <Route path="/projects" element={<Projects />} />
      </Route>
    </Routes>
  )
}
