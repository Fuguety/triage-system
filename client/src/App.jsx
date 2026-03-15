import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Assessment from "./pages/Assessment"
import Queue from "./pages/Queue"
import Admin from "./pages/Admin"
import AdminAudit from "./pages/AdminAudit"
import AdminPatient from "./pages/AdminPatient"
import Settings from "./pages/Settings"

function App() 
{
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/assessment" element={<Assessment />} />
      <Route path="/queue" element={<Queue />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/audit" element={<AdminAudit />} />
      <Route path="/admin/queue/:sessionId" element={<AdminPatient />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}

export default App
