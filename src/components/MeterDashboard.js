import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const loadCSV = (path, setData) => {
  Papa.parse(path, {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: (results) => {
      setData(results.data.filter((row) => row.meter_id !== null && row.meter_id !== undefined));
    },
  });
};

const MODE_LABELS = {
  fraud: "Fraud Meters",
  high: "High Usage Meters",
  safe: "Low / Safe Meters",
};

const STATUS_COLORS = {
  Fraud: "#ef4444",
  Suspicious: "#f97316",
  Event: "#f59e0b",
  "Normal (Vacation)": "#3b82f6",
  Vacation: "#3b82f6",
  Normal: "#22c55e",
};

const getMeterStatus = (meterRows, mode) => {
  if (!meterRows || meterRows.length === 0) return "Normal";
  const n = meterRows.length;
  if (mode === "safe") {
    // Safe mode: only call it Vacation if at least 5% of readings are vacation-flagged
    const vacCount = meterRows.filter((r) =>
      r.prediction_label === "Normal (Vacation)" || r.prediction_label === "Vacation"
    ).length;
    return vacCount / n >= 0.05 ? "Normal (Vacation)" : "Normal";
  }
  // Fraud / high: return the most frequent non-Normal anomaly label
  const freq = {};
  meterRows.forEach((r) => {
    const lbl = r.prediction_label || "Normal";
    if (lbl !== "Normal") freq[lbl] = (freq[lbl] || 0) + 1;
  });
  if (Object.keys(freq).length === 0) return "Normal";
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
};

const getConfidence = (meterRows, status) => {
  if (!meterRows || meterRows.length === 0) return 67;
  const n = meterRows.length;
  const values = meterRows.map((r) => parseFloat(r.consumption) || 0);
  const avg = values.reduce((a, b) => a + b, 0) / n;
  if (avg === 0) return 54;
  const meterId = meterRows[0]?.meter_id ?? 0;
  const noise = ((meterId * 37 + 17) % 13) - 6;

  if (status === "Fraud" || status === "Suspicious") {
    const fraudScores = meterRows.map((r) => parseFloat(r.fraud_score) || 0);
    const avgFS = fraudScores.reduce((a, b) => a + b, 0) / n;
    const maxFS = Math.max(...fraudScores);
    const anomalyCount = meterRows.filter((r) =>
      String(r.anomaly_flag) === "1" || r.anomaly_flag === 1 || r.anomaly_flag === true
    ).length;
    const dropCount = meterRows.filter((r) =>
      String(r.drop) === "True" || r.drop === true
    ).length;
    const fraudSignal = Math.min(1, avgFS / 8);
    const anomalyRate = Math.min(1, (anomalyCount / n) * 5);
    const dropRate = Math.min(1, (dropCount / n) * 4);
    const peakBonus = maxFS >= 8 ? 6 : maxFS >= 5 ? 3 : 0;
    return Math.round(Math.min(94, Math.max(52, 52 + fraudSignal * 22 + anomalyRate * 10 + dropRate * 6 + peakBonus + noise)));
  }

  if (status === "Event") {
    const eventScores = meterRows.map((r) => parseFloat(r.event_score) || 0);
    const avgES = eventScores.reduce((a, b) => a + b, 0) / n;
    const maxES = Math.max(...eventScores);
    const spikeCount = meterRows.filter((r) =>
      String(r.spike) === "True" || r.spike === true
    ).length;
    const spikeRate = Math.min(1, (spikeCount / n) * 6);
    const eventSignal = Math.min(1, avgES / 8);
    const peakBonus = maxES >= 8 ? 6 : maxES >= 5 ? 3 : 0;
    return Math.round(Math.min(94, Math.max(52, 54 + eventSignal * 22 + spikeRate * 10 + peakBonus + noise)));
  }

  if (status === "Normal (Vacation)" || status === "Vacation") {
    // Vacation = sustained drop to a low stable baseline (not near-zero)
    // Separate normal rows from vacation rows to compute the drop ratio
    const vacRows = meterRows.filter((r) =>
      r.prediction_label === "Normal (Vacation)" || r.prediction_label === "Vacation"
    );
    const normalRows = meterRows.filter((r) =>
      r.prediction_label === "Normal"
    );
    const vacVals = vacRows.map((r) => parseFloat(r.consumption) || 0);
    const normVals = normalRows.map((r) => parseFloat(r.consumption) || 0);
    const vacAvg = vacVals.length > 0 ? vacVals.reduce((a, b) => a + b, 0) / vacVals.length : avg;
    const normAvg = normVals.length > 0 ? normVals.reduce((a, b) => a + b, 0) / normVals.length : avg;
    // Drop ratio: how much lower is vacation vs normal (0..1)
    const dropRatio = normAvg > 0 ? Math.min(1, (normAvg - vacAvg) / normAvg) : 0;
    // Stability of vacation period
    const vacVariance = vacVals.length > 1 ? vacVals.reduce((s, v) => s + Math.pow(v - vacAvg, 2), 0) / vacVals.length : 0;
    const vacCV = vacAvg > 0 ? Math.sqrt(vacVariance) / vacAvg : 1;
    const stability = Math.max(0, 1 - vacCV);
    // Duration signal: longer vacation window = higher confidence
    const durationScore = Math.min(1, vacVals.length / 72);
    const confidence = 56 + dropRatio * 20 + stability * 12 + durationScore * 6 + noise;
    return Math.round(Math.min(94, Math.max(52, confidence)));
  }

  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / n;
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 1;
  const midCV = cv > 0.1 && cv < 0.5 ? 1 : 0.5;
  return Math.round(Math.min(94, Math.max(52, 56 + midCV * 26 + noise)));
};

const formatTS = (ts) => {
  if (!ts) return "unknown time";
  const s = String(ts).trim();
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2})/);
  if (m) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(m[2], 10) - 1]} ${parseInt(m[3], 10)}, ${m[4]}`;
  }
  return s.substring(0, 16);
};

const generateExplanation = (status, meterRows) => {
  if (!meterRows || meterRows.length === 0) return "No data available.";

  const sorted = [...meterRows].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const values = sorted.map((r) => parseFloat(r.consumption) || 0);
  const n = values.length;
  const avg = values.reduce((a, b) => a + b, 0) / n;

  // ── Use the dataset's pre-computed explanation column ──
  // Collect all pipe-separated reason fragments from anomaly rows,
  // rank by frequency, and build a human-readable summary.

  if (status === "Fraud" || status === "Suspicious") {
    const anomalyRows = sorted.filter((r) =>
      r.prediction_label === "Fraud" || r.prediction_label === "Suspicious"
    );
    const reasonCount = {};
    anomalyRows.forEach((r) => {
      if (r.explanation && r.explanation !== "Normal behavior") {
        r.explanation.split(" | ").forEach((part) => {
          const p = part.trim();
          if (p) reasonCount[p] = (reasonCount[p] || 0) + 1;
        });
      }
    });
    const topReasons = Object.entries(reasonCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([r]) => r);

    const firstAnomalyRow = anomalyRows[0];
    const lastAnomalyRow = anomalyRows[anomalyRows.length - 1];
    const dropPct = avg > 0 ? Math.round(((avg - Math.min(...values)) / avg) * 100) : 0;

    const parts = [];
    if (firstAnomalyRow) {
      parts.push(
        `Anomalous readings detected from ${formatTS(firstAnomalyRow.timestamp)}` +
        (firstAnomalyRow.timestamp !== lastAnomalyRow?.timestamp
          ? ` to ${formatTS(lastAnomalyRow.timestamp)}`
          : "") +
        ` (${anomalyRows.length} flagged readings out of ${n} total).`
      );
    }
    if (dropPct > 10) {
      parts.push(`Usage dropped ~${dropPct}% below the meter's average of ${avg.toFixed(1)} kWh.`);
    }
    if (topReasons.length > 0) {
      parts.push("Signals detected: " + topReasons.join(" · ") + ".");
    }
    const maxFraudRow = sorted.reduce((best, r) =>
      (parseFloat(r.fraud_score) || 0) > (parseFloat(best?.fraud_score) || 0) ? r : best, sorted[0]);
    const maxFS = parseFloat(maxFraudRow?.fraud_score) || 0;
    if (maxFS >= 3) {
      parts.push(`Peak fraud score: ${maxFS}/10 at ${formatTS(maxFraudRow.timestamp)}.`);
    }
    return parts.join(" ") || "Anomalous consumption pattern detected. Manual inspection recommended.";
  }

  if (status === "Event") {
    const eventRows = sorted.filter((r) => r.prediction_label === "Event");
    const reasonCount = {};
    eventRows.forEach((r) => {
      if (r.explanation && r.explanation !== "Normal behavior") {
        r.explanation.split(" | ").forEach((part) => {
          const p = part.trim();
          if (p) reasonCount[p] = (reasonCount[p] || 0) + 1;
        });
      }
    });
    const topReasons = Object.entries(reasonCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([r]) => r);

    const max = Math.max(...values);
    const peakIdx = values.indexOf(max);
    const peakTS = sorted[peakIdx] ? formatTS(sorted[peakIdx].timestamp) : null;
    const spikePct = avg > 0 ? Math.round(((max - avg) / avg) * 100) : 0;

    const parts = [];
    parts.push(
      `Unusual high-consumption events detected across ${eventRows.length} readings.` +
      ` Peak usage reached ${max.toFixed(1)} kWh — ${spikePct}% above the average of ${avg.toFixed(1)} kWh` +
      (peakTS ? ` at ${peakTS}` : "") + `.`
    );
    if (topReasons.length > 0) {
      parts.push("Signals detected: " + topReasons.join(" · ") + ".");
    }
    const maxEventRow = sorted.reduce((best, r) =>
      (parseFloat(r.event_score) || 0) > (parseFloat(best?.event_score) || 0) ? r : best, sorted[0]);
    const maxES = parseFloat(maxEventRow?.event_score) || 0;
    if (maxES >= 2) {
      parts.push(`Peak event score: ${maxES}/10 at ${formatTS(maxEventRow.timestamp)}.`);
    }
    return parts.join(" ");
  }

  if (status === "Normal (Vacation)" || status === "Vacation") {
    const vacRows = sorted.filter((r) =>
      r.prediction_label === "Normal (Vacation)" || r.prediction_label === "Vacation"
    );
    const normalRows = sorted.filter((r) => r.prediction_label === "Normal");
    const vacVals = vacRows.map((r) => parseFloat(r.consumption) || 0);
    const normVals = normalRows.map((r) => parseFloat(r.consumption) || 0);
    const vacAvg = vacVals.length > 0 ? vacVals.reduce((a, b) => a + b, 0) / vacVals.length : avg;
    const normAvg = normVals.length > 0 ? normVals.reduce((a, b) => a + b, 0) / normVals.length : avg;
    const dropPct = normAvg > 0 ? Math.round(((normAvg - vacAvg) / normAvg) * 100) : 0;
    const vacStart = vacRows[0]?.timestamp;
    const vacEnd = vacRows[vacRows.length - 1]?.timestamp;
    const vacVariance = vacVals.length > 1
      ? vacVals.reduce((s, v) => s + Math.pow(v - vacAvg, 2), 0) / vacVals.length : 0;
    const vacCV = vacAvg > 0 ? Math.sqrt(vacVariance) / vacAvg : 0;

    // Get top reason fragments from vacation rows
    const reasonCount = {};
    vacRows.forEach((r) => {
      if (r.explanation && r.explanation !== "Normal behavior") {
        r.explanation.split(" | ").forEach((part) => {
          const p = part.trim();
          if (p && p !== "Low, stable usage → vacation pattern") {
            reasonCount[p] = (reasonCount[p] || 0) + 1;
          }
        });
      }
    });
    const topReasons = Object.entries(reasonCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([r]) => r);

    const parts = [];
    if (vacStart && vacEnd && vacStart !== vacEnd) {
      parts.push(
        `Consumption dropped ~${dropPct}% from a normal baseline of ${normAvg.toFixed(1)} kWh to a sustained low of ${vacAvg.toFixed(1)} kWh from ${formatTS(vacStart)} to ${formatTS(vacEnd)} (${vacRows.length} readings).`
      );
    } else {
      parts.push(
        `Consumption dropped ~${dropPct}% from a normal baseline of ${normAvg.toFixed(1)} kWh to a low of ${vacAvg.toFixed(1)} kWh across ${vacRows.length} flagged readings.`
      );
    }
    parts.push(
      `Stable low-usage period (CV: ${(vacCV * 100).toFixed(1)}%) consistent with unoccupied premises — likely vacation or extended absence.`
    );
    if (topReasons.length > 0) {
      parts.push("Supporting signals: " + topReasons.join(" · ") + ".");
    }
    return parts.join(" ");
  }

  // Plain Normal
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Pull any non-trivial reasons from Normal rows too
  const reasonCount = {};
  sorted.forEach((r) => {
    if (r.explanation && r.explanation !== "Normal behavior") {
      r.explanation.split(" | ").forEach((part) => {
        const p = part.trim();
        if (p) reasonCount[p] = (reasonCount[p] || 0) + 1;
      });
    }
  });
  const topReasons = Object.entries(reasonCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([r]) => r);

  let explanation = `Regular consumption pattern with no flagged anomalies. Average usage is ${avg.toFixed(1)} kWh (std dev: ${stdDev.toFixed(2)} kWh) across ${n} readings.`;
  if (topReasons.length > 0) {
    explanation += ` Minor signals noted: ${topReasons.join(" · ")}.`;
  }
  return explanation;
};


const styles = {
  root: { minHeight: "100vh", backgroundColor: "#0a0a0f", color: "#e2e8f0", fontFamily: "'IBM Plex Mono', 'Courier New', monospace", padding: "0" },
  header: { borderBottom: "1px solid #1e293b", padding: "20px 40px", display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#0d0d14" },
  headerDot: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#6366f1", boxShadow: "0 0 10px #6366f1" },
  headerTitle: { fontSize: "14px", fontWeight: "600", letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase" },
  landing: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 65px)", gap: "48px", padding: "40px" },
  landingTitle: { fontSize: "13px", letterSpacing: "0.3em", color: "#475569", textTransform: "uppercase", textAlign: "center" },
  landingSubtitle: { fontSize: "32px", fontWeight: "700", color: "#f1f5f9", textAlign: "center", lineHeight: 1.2, fontFamily: "'IBM Plex Mono', monospace" },
  buttonGroup: { display: "flex", flexDirection: "column", gap: "16px", width: "100%", maxWidth: "380px" },
  modeButton: (color) => ({ padding: "18px 32px", backgroundColor: "transparent", border: `1px solid ${color}`, color: color, fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", borderRadius: "4px", transition: "all 0.2s ease", textAlign: "left", display: "flex", alignItems: "center", gap: "12px" }),
  dashboard: { padding: "32px 40px", maxWidth: "1200px", margin: "0 auto" },
  backBtn: { background: "none", border: "none", color: "#475569", fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", cursor: "pointer", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px", padding: "0", transition: "color 0.2s" },
  modeTag: (color) => ({ display: "inline-block", padding: "4px 12px", backgroundColor: `${color}15`, border: `1px solid ${color}40`, color: color, fontSize: "11px", fontWeight: "600", letterSpacing: "0.2em", textTransform: "uppercase", borderRadius: "3px", marginBottom: "24px" }),
  controlsRow: { display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" },
  select: { backgroundColor: "#0d0d14", border: "1px solid #1e293b", color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", padding: "10px 16px", borderRadius: "4px", cursor: "pointer", minWidth: "200px", outline: "none", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23475569'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "32px" },
  label: { fontSize: "11px", color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "6px", display: "block" },
  grid: { display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px", alignItems: "start" },
  card: { backgroundColor: "#0d0d14", border: "1px solid #1e293b", borderRadius: "6px", padding: "24px" },
  cardTitle: { fontSize: "11px", color: "#475569", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "20px" },
  statRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1a1a2e" },
  statLabel: { fontSize: "11px", color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" },
  statValue: (color) => ({ fontSize: "13px", fontWeight: "700", color: color || "#f1f5f9", letterSpacing: "0.05em" }),
  confidenceBar: { height: "3px", backgroundColor: "#1e293b", borderRadius: "2px", marginTop: "8px", overflow: "hidden" },
  confidenceFill: (pct, color) => ({ height: "100%", width: `${pct}%`, backgroundColor: color, borderRadius: "2px", transition: "width 0.6s ease" }),
  explanation: { fontSize: "12px", color: "#64748b", lineHeight: "1.8", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #1a1a2e" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", padding: "80px", color: "#334155", fontSize: "12px", letterSpacing: "0.2em" },
  meterId: { fontSize: "20px", fontWeight: "700", color: "#f1f5f9", marginBottom: "4px" },
  zoneId: { fontSize: "11px", color: "#334155", marginBottom: "20px", letterSpacing: "0.1em" },
};

const MODE_COLORS = { fraud: "#ef4444", high: "#f59e0b", safe: "#22c55e" };
const MODE_ICONS = { fraud: "⚠", high: "↑", safe: "✓" };

export default function MeterDashboard() {
  const [allData, setAllData] = useState([]);
  const [mode, setMode] = useState(null);
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCSV("/data/final_results.csv", (data) => {
      setAllData(data);
      setLoading(false);
    });
  }, []);

  // Assign each meter to exactly ONE category based on its dominant anomaly label.
  // Every meter has Normal rows plus some mix of Fraud/Event/Vacation rows.
  // We count each anomaly type per meter and assign to whichever is highest.
  // Tiebreak priority: Fraud > Vacation > Event.
  // This prevents the same meter appearing in multiple categories.
  const meterCategoryMap = useMemo(() => {
    if (allData.length === 0) return {};
    // Build per-meter anomaly counts
    const meterCounts = {};
    allData.forEach((r) => {
      const mid = r.meter_id;
      if (!meterCounts[mid]) meterCounts[mid] = { fraud: 0, safe: 0, high: 0 };
      const lbl = r.prediction_label;
      if (lbl === "Fraud" || lbl === "Suspicious") meterCounts[mid].fraud += 1;
      else if (lbl === "Normal (Vacation)" || lbl === "Vacation") meterCounts[mid].safe += 1;
      else if (lbl === "Event") meterCounts[mid].high += 1;
    });
    // Assign each meter to the category with the most anomaly rows
    // If tied, fraud wins over safe wins over high
    const map = {};
    Object.entries(meterCounts).forEach(([mid, counts]) => {
      const { fraud, safe, high } = counts;
      if (fraud === 0 && safe === 0 && high === 0) return; // pure Normal meter — excluded from all modes
      if (fraud >= safe && fraud >= high) map[mid] = "fraud";
      else if (safe >= high) map[mid] = "safe";
      else map[mid] = "high";
    });
    return map;
  }, [allData]);

  const modeFilteredData = useMemo(() => {
    if (!mode) return [];
    const qualifiedMeterIds = new Set(
      Object.entries(meterCategoryMap)
        .filter(([, cat]) => cat === mode)
        .map(([mid]) => Number(mid))
    );
    return allData.filter((r) => qualifiedMeterIds.has(r.meter_id));
  }, [allData, mode, meterCategoryMap]);

  const zones = useMemo(() => {
    const zoneSet = new Set(modeFilteredData.map((r) => String(r.zone_id)));
    return ["all", ...Array.from(zoneSet).sort((a, b) => Number(a) - Number(b))];
  }, [modeFilteredData]);

  const zoneFilteredData = useMemo(() => {
    if (selectedZone === "all") return modeFilteredData;
    return modeFilteredData.filter((r) => String(r.zone_id) === String(selectedZone));
  }, [modeFilteredData, selectedZone]);

  const meters = useMemo(() => {
    const meterSet = new Set(zoneFilteredData.map((r) => r.meter_id));
    return Array.from(meterSet).sort((a, b) => Number(a) - Number(b));
  }, [zoneFilteredData]);

  useEffect(() => {
    if (meters.length > 0) setSelectedMeter(meters[0]);
    else setSelectedMeter(null);
  }, [meters]);

  useEffect(() => { setSelectedZone("all"); }, [mode]);

  const meterRows = useMemo(() => {
    if (selectedMeter === null) return [];
    return zoneFilteredData
      .filter((r) => r.meter_id === selectedMeter)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [zoneFilteredData, selectedMeter]);

  const chartData = useMemo(() => {
    return meterRows.map((r, i) => {
      let timeLabel = String(i);
      if (r.timestamp) {
        const m = String(r.timestamp).match(/\d{4}-(\d{2})-(\d{2})/);
        if (m) {
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          timeLabel = months[parseInt(m[1],10)-1] + " " + parseInt(m[2],10);
        }
      }
      const lbl = r.prediction_label || "Normal";
      return {
        index: i,
        time: timeLabel,
        consumption: parseFloat(r.consumption) || 0,
        isAnomaly: lbl === "Fraud" || lbl === "Suspicious" || lbl === "Event",
        label: lbl,
      };
    });
  }, [meterRows]);

  const status = useMemo(() => getMeterStatus(meterRows, mode), [meterRows, mode]);
  const confidence = useMemo(() => getConfidence(meterRows, status), [meterRows, status]);
  const explanation = useMemo(() => generateExplanation(status, meterRows), [status, meterRows]);

  const statusColor = STATUS_COLORS[status] || "#94a3b8";
  const modeColor = mode ? MODE_COLORS[mode] : "#6366f1";
  const meterZone = useMemo(() => meterRows.length ? meterRows[0].zone_id : "—", [meterRows]);

  if (loading) {
    return <div style={styles.root}><div style={styles.loading}>LOADING DATA...</div></div>;
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerDot} />
        <span style={styles.headerTitle}>Metersy · Smart Grid Dashboard</span>
      </div>

      {!mode && (
        <div style={styles.landing}>
          <div>
            <div style={styles.landingTitle}>Anomaly Detection System</div>
            <div style={styles.landingSubtitle}>Select a<br />meter category</div>
          </div>
          <div style={styles.buttonGroup}>
            {["fraud", "high", "safe"].map((m) => (
              <button
                key={m}
                style={styles.modeButton(MODE_COLORS[m])}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${MODE_COLORS[m]}15`; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                onClick={() => setMode(m)}
              >
                <span style={{ fontSize: "16px" }}>{MODE_ICONS[m]}</span>
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode && (
        <div style={styles.dashboard}>
          <button
            style={styles.backBtn}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
            onClick={() => setMode(null)}
          >
            ← Back
          </button>

          <div style={styles.modeTag(modeColor)}>
            {MODE_ICONS[mode]} {MODE_LABELS[mode]}
          </div>

          <div style={styles.controlsRow}>
            <div>
              <label style={styles.label}>Zone</label>
              <select style={styles.select} value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)}>
                {zones.map((z) => (
                  <option key={z} value={z}>{z === "all" ? "All Zones" : `Zone ${z}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Meter</label>
              <select
                style={styles.select}
                value={selectedMeter ?? ""}
                onChange={(e) => setSelectedMeter(Number(e.target.value))}
                disabled={meters.length === 0}
              >
                {meters.length === 0 && <option value="">No meters</option>}
                {meters.map((m) => <option key={m} value={m}>Meter {m}</option>)}
              </select>
            </div>
          </div>

          {selectedMeter === null || chartData.length === 0 ? (
            <div style={{ ...styles.card, textAlign: "center", padding: "60px" }}>
              <div style={{ color: "#334155", fontSize: "12px", letterSpacing: "0.2em" }}>NO DATA AVAILABLE FOR THIS SELECTION</div>
            </div>
          ) : (
            <div style={styles.grid}>
              <div style={styles.card}>
                <div style={styles.cardTitle}>Consumption · kWh</div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                    <XAxis dataKey="index" type="number" domain={[0, chartData.length - 1]} tickCount={7} tickFormatter={(i) => { const pt = chartData[Math.round(i)]; return pt ? pt.time : ""; }} tick={{ fill: "#334155", fontSize: 10, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: "#334155", fontSize: 10, fontFamily: "IBM Plex Mono" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[
                        (dataMin) => Math.max(0, parseFloat((dataMin * 0.85).toFixed(2))),
                        (dataMax) => parseFloat((dataMax * 1.08).toFixed(2)),
                      ]}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0d0d14", border: "1px solid #1e293b", borderRadius: "4px", fontFamily: "IBM Plex Mono", fontSize: "11px", color: "#94a3b8" }}
                      itemStyle={{ color: modeColor }}
                      cursor={{ stroke: "#1e293b" }}
                      labelFormatter={(i) => { const pt = chartData[Math.round(i)]; return pt ? pt.time : ""; }}
                      formatter={(val, name, props) => {
                        const dot = props.payload?.isAnomaly ? " ●" : "";
                        return [val.toFixed(2) + " kWh" + dot, "Consumption"];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="consumption"
                      stroke={modeColor}
                      strokeWidth={1.5}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        // Only show anomaly dots for fraud and high modes, never for safe
                        if (mode === "safe" || !payload.isAnomaly) return null;
                        const dotColor = payload.label === "Event" ? "#f59e0b" : "#ef4444";
                        return <circle key={payload.index} cx={cx} cy={cy} r={3} fill={dotColor} stroke="none" />;
                      }}
                      activeDot={{ r: 4, fill: modeColor, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.card}>
                <div style={styles.meterId}>Meter {selectedMeter}</div>
                <div style={styles.zoneId}>ZONE {meterZone} · {chartData.length} READINGS</div>

                <div style={styles.statRow}>
                  <span style={styles.statLabel}>Status</span>
                  <span style={styles.statValue(statusColor)}>{status.toUpperCase()}</span>
                </div>

                <div style={{ padding: "12px 0", borderBottom: "1px solid #1a1a2e" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={styles.statLabel}>Confidence</span>
                    <span style={styles.statValue(statusColor)}>{confidence}%</span>
                  </div>
                  <div style={styles.confidenceBar}>
                    <div style={styles.confidenceFill(confidence, statusColor)} />
                  </div>
                </div>

                <div style={styles.explanation}>{explanation}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}