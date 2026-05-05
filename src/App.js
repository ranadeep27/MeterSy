import React, { useState } from "react";
import ZoneDashboard from "./components/ZoneDashboard";
import MeterDashboard from "./components/MeterDashboard";

function App() {
  const [screen, setScreen] = useState("zone");

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      {/* Floating Nav — 2 buttons only */}
      <div style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        display: "flex",
        gap: "10px",
        zIndex: 100,
      }}>
        <div
          onClick={() => setScreen("zone")}
          title="Zone Dashboard"
          style={navStyle(screen === "zone")}
        >
          ⚡
        </div>
        <div
          onClick={() => setScreen("meter")}
          title="Meter Dashboard"
          style={navStyle(screen === "meter")}
        >
          🔍
        </div>
      </div>

      {screen === "zone" && <ZoneDashboard />}
      {screen === "meter" && <MeterDashboard />}
    </div>
  );
}

const navStyle = (active) => ({
  width: "46px",
  height: "46px",
  borderRadius: "50%",
  background: active ? "#1d4ed8" : "#0d0d14",
  border: active ? "1px solid #3b82f6" : "1px solid #1e293b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "18px",
  boxShadow: active ? "0 0 16px #1d4ed840" : "none",
  transition: "all 0.2s ease",
});

export default App;