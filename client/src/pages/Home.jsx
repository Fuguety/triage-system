import { useNavigate } from "react-router-dom"

function Home() 
{
  const navigate = useNavigate()

  return (
    <div className="container">
      <h1>Triage Support System</h1>
      <p>AI-based patient prioritization</p>
      <div className="answer-list">
        <button onClick={() => navigate("/assessment")}>
          Start Assessment
        </button>
        <button className="secondary-button" onClick={() => navigate("/queue")}>
          View Queue
        </button>
      </div>
    </div>
  )
}

export default Home
