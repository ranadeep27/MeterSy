import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { loadCSV } from "../utils/loadCSV";

export default function ZoneDashboard() {
  const [data, setData] = useState([]);
  const [selectedZone, setSelectedZone] = useState(0);

  useEffect(() => {
    loadCSV("/data/zone_predictions.csv", setData);
  }, []);

  const cleanData = data.filter(
    (d) => d.zone_id !== undefined && d.zone_id !== null
  );

  const zones = [...new Set(cleanData.map((d) => d.zone_id))];

  const zoneData = cleanData.filter((d) => d.zone_id === selectedZone);

  // -------------------------
  // Compute stats for selected zone
  // -------------------------
  const avgLoad =
    zoneData.reduce((sum, d) => sum + d.load_score, 0) /
    (zoneData.length || 1);

  const maxLoad = Math.max(...zoneData.map((d) => d.load_score || 0));
  const minLoad = Math.min(...zoneData.map((d) => d.load_score || 0));

  let zoneRisk = "Safe";
  if (avgLoad > 0.7) zoneRisk = "High Risk";
  else if (avgLoad > 0.4) zoneRisk = "Warning";

  // -------------------------
  // Zone summary (ranking logic)
  // -------------------------
  const zoneAvg = {};

  cleanData.forEach((d) => {
    if (!zoneAvg[d.zone_id]) {
      zoneAvg[d.zone_id] = { total: 0, count: 0 };
    }
    zoneAvg[d.zone_id].total += d.load_score;
    zoneAvg[d.zone_id].count += 1;
  });

  const zoneArray = Object.keys(zoneAvg).map((z) => {
    const avg = zoneAvg[z].total / zoneAvg[z].count;
    return { zone: z, avg };
  });

  zoneArray.sort((a, b) => b.avg - a.avg);

  const totalZones = zoneArray.length;
  const zoneRiskMap = {};

  zoneArray.forEach((z, i) => {
    if (i < totalZones * 0.3) {
      zoneRiskMap[z.zone] = "High Risk";
    } else if (i < totalZones * 0.7) {
      zoneRiskMap[z.zone] = "Warning";
    } else {
      zoneRiskMap[z.zone] = "Safe";
    }
  });

  // -------------------------
  // UI
  // -------------------------
  return (
    <div>
      <h2>⚡ Zone Demand Dashboard</h2>

      {/* Selector */}
      <div style={{ marginBottom: "15px" }}>
        <label>Select Zone: </label>
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(Number(e.target.value))}
        >
          {zones.map((z, i) => (
            <option key={i} value={z}>
              Zone {z}
            </option>
          ))}
        </select>
      </div>

      {/* Graph */}
      <LineChart width={900} height={300} data={zoneData.slice(0, 100)}>
        <XAxis dataKey="timestamp" hide />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line dataKey="consumption" stroke="blue" />
        <Line dataKey="prediction" stroke="green" />
      </LineChart>

      {/* 🔥 LIVE VALIDATION PANEL */}
      <h3>📊 Zone Metrics (Verification)</h3>

      <div style={{ marginBottom: "20px" }}>
        <p><b>Average Load:</b> {(avgLoad * 100).toFixed(2)}%</p>
        <p><b>Max Load:</b> {(maxLoad * 100).toFixed(2)}%</p>
        <p><b>Min Load:</b> {(minLoad * 100).toFixed(2)}%</p>
        <p>
          <b>Final Risk:</b>{" "}
          <span style={{
            color:
              zoneRisk === "High Risk"
                ? "red"
                : zoneRisk === "Warning"
                ? "orange"
                : "green",
            fontWeight: "bold"
          }}>
            {zoneRisk}
          </span>
        </p>
      </div>

      {/* Summary */}
      <h3>🔥 Zone Risk Summary</h3>

      {zoneArray.map((z, i) => {
        const risk = zoneRiskMap[z.zone];

        return (
          <div key={i}>
            Zone {z.zone} →{" "}
            <span
              style={{
                color:
                  risk === "High Risk"
                    ? "red"
                    : risk === "Warning"
                    ? "orange"
                    : "green",
                fontWeight: "bold",
              }}
            >
              {risk}
            </span>{" "}
            ({(z.avg * 100).toFixed(1)}%)
          </div>
        );
      })}
    </div>
  );
}