import { useState } from "react";
import "./App.css";

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const startDetection = async () => {
    setLoading(true);
    setResult(null);

    const response = await fetch("http://127.0.0.1:8000/predict-engagement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    setResult(data.data);
    setLoading(false);
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>Student Engagement</h1>
        <p className="subtitle">
          Real-time engagement analysis using CV, HCI and ML
        </p>

        <button onClick={startDetection}>
          Start Detection
        </button>

        {loading && (
          <p className="loading">Analyzing engagement...</p>
        )}

        {result && (
          <div className="result">
            <div className="score">
              {result.engagement_score}%
            </div>
            <div
              className={
                result.label === "Engaged"
                  ? "engaged"
                  : "disengaged"
              }
            >
              {result.label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
