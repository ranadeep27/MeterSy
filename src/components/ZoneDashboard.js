import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { loadCSV } from "../utils/loadCSV";

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0f",
    color: "#e2e8f0",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  },
  header: {
    borderBottom: "1px solid #1e293b",
    padding: "20px 40px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#0d0d14",
  },
  headerDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#38bdf8",
    boxShadow: "0 0 10px #38bdf8",
  },
  headerTitle: {
    fontSize: "14px",
    fontWeight: "600",
    letterSpacing: "0.15em",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  body: {
    padding: "36px 40px",
    maxWidth: "1300px",
    margin: "0 auto",
  },
  topRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "16px",
  },
  pageLabel: {
    fontSize: "11px",
    color: "#334155",
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  pageTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#f1f5f9",
    letterSpacing: "0.02em",
  },
  selectWrap: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "11px",
    color: "#475569",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  select: {
    backgroundColor: "#0d0d14",
    border: "1px solid #1e293b",
    color: "#94a3b8",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    padding: "10px 36px 10px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    minWidth: "180px",
    outline: "none",
    appearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23475569'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: (accent) => ({
    backgroundColor: "#0d0d14",
    border: `1px solid ${accent ? accent + "30" : "#1e293b"}`,
    borderRadius: "6px",
    padding: "20px 24px",
  }),
  statLabel: {
    fontSize: "11px",
    color: "#475569",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  statValue: (color) => ({
    fontSize: "26px",
    fontWeight: "700",
    color: color || "#f1f5f9",
    letterSpacing: "0.02em",
    lineHeight: 1,
  }),
  statSub: {
    fontSize: "11px",
    color: "#334155",
    marginTop: "6px",
    letterSpacing: "0.1em",
  },
  card: {
    backgroundColor: "#0d0d14",
    border: "1px solid #1e293b",
    borderRadius: "6px",
    padding: "24px",
    marginBottom: "24px",
  },
  cardTitle: {
    fontSize: "11px",
    color: "#475569",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  legendDot: (color) => ({
    width: "8px",
    height: "2px",
    backgroundColor: color,
    display: "inline-block",
    borderRadius: "1px",
  }),
  rankingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1px",
    backgroundColor: "#1e293b",
    borderRadius: "4px",
    overflow: "hidden",
  },
  rankRow: (isSelected) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: isSelected ? "#111827" : "#0d0d14",
    cursor: "pointer",
    transition: "background 0.15s",
  }),
  rankZone: (isSelected) => ({
    fontSize: "12px",
    color: isSelected ? "#f1f5f9" : "#64748b",
    fontWeight: isSelected ? "700" : "400",
    letterSpacing: "0.08em",
  }),
  rankBadge: (color) => ({
    fontSize: "10px",
    fontWeight: "600",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: color,
    backgroundColor: color + "15",
    border: `1px solid ${color}30`,
    padding: "3px 8px",
    borderRadius: "3px",
  }),
  barTrack: {
    height: "2px",
    backgroundColor: "#1a1a2e",
    borderRadius: "1px",
    marginTop: "6px",
    overflow: "hidden",
  },
  barFill: (pct, color) => ({
    height: "100%",
    width: `${Math.min(pct, 100)}%`,
    backgroundColor: color,
    borderRadius: "1px",
  }),
  emptyState: {
    textAlign: "center",
    padding: "60px",
    color: "#334155",
    fontSize: "12px",
    letterSpacing: "0.2em",
  },
};

const riskColor = (risk) =>
  risk === "High Risk" ? "#ef4444" : risk === "Warning" ? "#f59e0b" : "#22c55e";

// ─── Component ────────────────────────────────────────────────────────────────
export default function ZoneDashboard() {
  const [data, setData] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    loadCSV("/data/zone_predictions.csv", (rows) => {
      const clean = rows.filter((d) => d.zone_id !== undefined && d.zone_id !== null);
      setData(clean);
      if (clean.length > 0) setSelectedZone(clean[0].zone_id);
    });
  }, []);

  const zones = useMemo(() => [...new Set(data.map((d) => d.zone_id))].sort((a, b) => a - b), [data]);

  // Zone avg load scores
  const zoneArray = useMemo(() => {
    const agg = {};
    data.forEach((d) => {
      if (!agg[d.zone_id]) agg[d.zone_id] = { total: 0, count: 0 };
      agg[d.zone_id].total += d.load_score || 0;
      agg[d.zone_id].count += 1;
    });
    return Object.keys(agg)
      .map((z) => ({ zone: Number(z), avg: agg[z].total / agg[z].count }))
      .sort((a, b) => b.avg - a.avg);
  }, [data]);

  const zoneRiskMap = useMemo(() => {
    const total = zoneArray.length;
    const map = {};
    zoneArray.forEach((z, i) => {
      map[z.zone] =
        i < total * 0.3 ? "High Risk" : i < total * 0.7 ? "Warning" : "Safe";
    });
    return map;
  }, [zoneArray]);

  const zoneData = useMemo(
    () => data.filter((d) => d.zone_id === selectedZone).slice(0, 120),
    [data, selectedZone]
  );

  const avgLoad = useMemo(() => {
    if (!zoneData.length) return 0;
    return zoneData.reduce((s, d) => s + (d.load_score || 0), 0) / zoneData.length;
  }, [zoneData]);

  const selectedRisk = zoneRiskMap[selectedZone] || "—";
  const rc = riskColor(selectedRisk);

  const chartData = useMemo(
    () =>
      zoneData.map((d, i) => ({
        i,
        time: d.timestamp ? String(d.timestamp).substring(11, 16) : String(i),
        consumption: parseFloat(d.consumption) || 0,
        prediction: parseFloat(d.prediction) || 0,
      })),
    [zoneData]
  );

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerDot} />
        <span style={S.headerTitle}>Metersy · Zone Intelligence</span>
      </div>

      <div style={S.body}>
        {/* Top row */}
        <div style={S.topRow}>
          <div>
            <div style={S.pageLabel}>Grid Overview</div>
            <div style={S.pageTitle}>Zone Analysis</div>
          </div>
          <div style={S.selectWrap}>
            <label style={S.label}>Active Zone</label>
            <select
              style={S.select}
              value={selectedZone ?? ""}
              onChange={(e) => setSelectedZone(Number(e.target.value))}
            >
              {zones.map((z) => (
                <option key={z} value={z}>Zone {z}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stat cards */}
        <div style={S.statsRow}>
          <div style={S.statCard("#38bdf8")}>
            <div style={S.statLabel}>Avg Load Score</div>
            <div style={S.statValue("#38bdf8")}>{(avgLoad * 100).toFixed(1)}%</div>
            <div style={S.barTrack}>
              <div style={S.barFill(avgLoad * 100, "#38bdf8")} />
            </div>
          </div>

          <div style={S.statCard(rc)}>
            <div style={S.statLabel}>Risk Status</div>
            <div style={S.statValue(rc)}>{selectedRisk}</div>
            <div style={S.statSub}>
              {selectedRisk === "High Risk"
                ? "Top 30% by load"
                : selectedRisk === "Warning"
                ? "Mid 40% by load"
                : "Bottom 30% by load"}
            </div>
          </div>

          <div style={S.statCard()}>
            <div style={S.statLabel}>Readings</div>
            <div style={S.statValue()}>{zoneData.length}</div>
            <div style={S.statSub}>of {data.length} total rows</div>
          </div>
        </div>

        {/* Chart */}
        <div style={S.card}>
          <div style={S.cardTitle}>
            Zone Demand Over Time
            <span style={{ marginLeft: "auto", display: "flex", gap: "16px", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#38bdf8" }}>
                <span style={S.legendDot("#38bdf8")} /> Actual
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#22c55e" }}>
                <span style={S.legendDot("#22c55e")} /> Predicted
              </span>
            </span>
          </div>

          {chartData.length === 0 ? (
            <div style={S.emptyState}>NO DATA FOR THIS ZONE</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#334155", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor(chartData.length / 6) || 0}
                />
                <YAxis
                  tick={{ fill: "#334155", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d0d14",
                    border: "1px solid #1e293b",
                    borderRadius: "4px",
                    fontFamily: "IBM Plex Mono",
                    fontSize: "11px",
                    color: "#94a3b8",
                  }}
                  cursor={{ stroke: "#1e293b" }}
                />
                <Line
                  name="Actual"
                  type="monotone"
                  dataKey="consumption"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: "#38bdf8", strokeWidth: 0 }}
                />
                <Line
                  name="Predicted"
                  type="monotone"
                  dataKey="prediction"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Zone Risk Ranking */}
        <div style={S.card}>
          <div style={S.cardTitle}>Zone Risk Ranking</div>
          <div style={S.rankingGrid}>
            {zoneArray.map((z) => {
              const risk = zoneRiskMap[z.zone];
              const color = riskColor(risk);
              const isSelected = z.zone === selectedZone;
              return (
                <div
                  key={z.zone}
                  style={S.rankRow(isSelected)}
                  onClick={() => setSelectedZone(z.zone)}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#0f1623"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? "#111827" : "#0d0d14"; }}
                >
                  <div>
                    <div style={S.rankZone(isSelected)}>Zone {z.zone}</div>
                    <div style={{ fontSize: "11px", color: "#334155", marginTop: "2px" }}>
                      {(z.avg * 100).toFixed(1)}% avg load
                    </div>
                  </div>
                  <span style={S.rankBadge(color)}>{risk}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}