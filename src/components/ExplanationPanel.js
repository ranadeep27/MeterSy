import React, { useEffect, useState } from "react";
import { loadCSV } from "../utils/loadCSV";

export default function ExplanationPanel() {
  const [data, setData] = useState([]);
  const [selectedZone, setSelectedZone] = useState("All");
  const [selectedType, setSelectedType] = useState("All");

  useEffect(() => {
    loadCSV("/data/final_results.csv", setData);
  }, []);

  const clean = data.filter(d => d.meter_id !== undefined);

  // -------------------------
  // GROUP BY METER
  // -------------------------
  const meterMap = {};
  clean.forEach(d => {
    if (!meterMap[d.meter_id]) meterMap[d.meter_id] = [];
    meterMap[d.meter_id].push(d);
  });

  let results = [];

  Object.keys(meterMap).forEach(meter => {
    const rows = meterMap[meter];
    const zone = rows[0].zone_id;

    if (selectedZone !== "All" && zone !== Number(selectedZone)) return;

    // -------------------------
    // COUNT LABELS
    // -------------------------
    const counts = {};
    rows.forEach(r => {
      const label = r.prediction_label || "Normal";
      counts[label] = (counts[label] || 0) + 1;
    });

    // REMOVE NORMAL
    delete counts["Normal"];
    if (Object.keys(counts).length === 0) return;

    // -------------------------
    // PICK DOMINANT TYPE
    // -------------------------
    const type = Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b
    );

    if (selectedType !== "All" && type !== selectedType) return;

    const total = rows.length;
    const confidence = counts[type] / total;

    // -------------------------
    // BASE STATS
    // -------------------------
    const vals = rows.map(r => r.consumption);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);

    let explanation = "";

    // -------------------------
    // FRAUD
    // -------------------------
    if (type === "Fraud") {
      const drops = rows
        .filter(r => r.consumption < avg * 0.5)
        .sort((a, b) => a.consumption - b.consumption)
        .slice(0, 3)
        .map(r => r.timestamp);

      const dropPercent = ((1 - min / avg) * 100).toFixed(1);

      explanation =
        `Abnormal drops detected at ${drops.join(", ")}. ` +
        `Consumption decreased ${dropPercent}% below baseline (${avg.toFixed(2)} kWh). ` +
        `Pattern indicates possible tampering or bypass.`;
    }

    // -------------------------
    // EVENT
    // -------------------------
    else if (type === "Event") {
      const spikes = rows
        .filter(r => r.consumption > avg * 1.5)
        .sort((a, b) => b.consumption - a.consumption)
        .slice(0, 3)
        .map(r => r.timestamp);

      explanation =
        `High spikes observed at ${spikes.join(", ")}. ` +
        `Peak consumption ${max.toFixed(2)} kWh vs average ${avg.toFixed(2)} kWh. ` +
        `Indicates temporary high-load activity.`;
    }

    // -------------------------
    // VACATION
    // -------------------------
    else if (type === "Vacation") {
      const flat = rows
        .slice(0, 3)
        .map(r => r.timestamp);

      explanation =
        `Consistently low and stable consumption pattern. ` +
        `Average ${avg.toFixed(2)} kWh with minimal variation. ` +
        `Observed across timestamps like ${flat.join(", ")}.`;
    }

    results.push({
      meter,
      zone,
      type,
      confidence,
      explanation
    });
  });

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  const zones = [...new Set(clean.map(d => d.zone_id))];

  return (
    <div style={container}>
      <h2>🧠 AI Explainability Panel</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} style={select}>
          <option value="All">All Zones</option>
          {zones.map(z => <option key={z}>{z}</option>)}
        </select>

        <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={select}>
          <option>All</option>
          <option>Fraud</option>
          <option>Event</option>
          <option>Vacation</option>
        </select>
      </div>

      {/* Results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {results.length === 0 && <p>No anomalies found</p>}

        {results.map((r, i) => (
          <div key={i} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>Meter {r.meter}</h3>
              <span style={{ color: "#94a3b8" }}>Zone {r.zone}</span>
            </div>

            <p><b>Type:</b> <span style={{ color: getColor(r.type) }}>{r.type}</span></p>
            <p><b>Confidence:</b> {(r.confidence * 100).toFixed(1)}%</p>
            <p><b>Analysis:</b> {r.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------
const getColor = t => {
  if (t === "Fraud") return "#ef4444";
  if (t === "Event") return "#f59e0b";
  if (t === "Vacation") return "#3b82f6";
  return "#22c55e";
};

const container = {
  padding: 20,
  background: "#0f172a",
  minHeight: "100vh",
  color: "white"
};

const select = {
  padding: 10,
  borderRadius: 8
};

const card = {
  background: "#1e293b",
  padding: 20,
  borderRadius: 14
};