import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { loadCSV } from "../utils/loadCSV";

export default function MeterDashboard() {
  const [data, setData] = useState([]);
  const [meterId, setMeterId] = useState(0);

  useEffect(() => {
    loadCSV("/data/final_results.csv", setData);
  }, []);

  const meterData = data.filter(d => d.meter_id === meterId);
  const latest = meterData[meterData.length - 1];

  return (
    <div>
      <h2>🔍 Meter Intelligence</h2>

      <input
        type="number"
        value={meterId}
        onChange={(e) => setMeterId(Number(e.target.value))}
        placeholder="Enter meter id"
      />

      <LineChart width={900} height={300} data={meterData.slice(0, 100)}>
        <XAxis dataKey="timestamp" hide />
        <YAxis />
        <Tooltip />
        <Line dataKey="consumption" stroke="orange" />
      </LineChart>

      {latest && (
        <>
          <h3 style={{
            color:
              latest.prediction_label === "Fraud" ? "red" :
              latest.prediction_label === "Event" ? "orange" :
              latest.prediction_label.includes("Vacation") ? "blue" :
              "green"
          }}>
            Status: {latest.prediction_label}
          </h3>

          <h4>Confidence: {latest.confidence?.toFixed(2)}</h4>

          <p><b>Explanation:</b> {latest.explanation}</p>
        </>
      )}
    </div>
  );
}