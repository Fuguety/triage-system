import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Assessment from "./pages/Assessment"
import Queue from "./pages/Queue"

function App() 
{
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/assessment" element={<Assessment />} />
      <Route path="/queue" element={<Queue />} />
    </Routes>
  )
}

export default App
