import React, { useEffect, useState } from "react";
import { loadCSV } from "../utils/loadCSV";

export default function ExplanationPanel() {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadCSV("/data/final_results.csv", setData);
  }, []);

  const cases = data
    .filter(d => d.prediction_label !== "Normal")
    .slice(0, 15);

  return (
    <div>
      <h2>🧠 Explainability Panel</h2>

      {cases.map((d, i) => (
        <div key={i} style={{
          border: "1px solid #ddd",
          padding: "12px",
          marginBottom: "12px",
          borderRadius: "10px",
          background:
            d.prediction_label === "Fraud" ? "#ffe5e5" :
            d.prediction_label === "Event" ? "#fff4e5" :
            "#f5f5f5"
        }}>
          <p><b>Meter:</b> {d.meter_id}</p>
          <p><b>Type:</b> {d.prediction_label}</p>
          <p><b>Confidence:</b> {d.confidence?.toFixed(2)}</p>
          <p><b>Reason:</b> {d.explanation}</p>
        </div>
      ))}
    </div>
  );
}