import React, { useState } from "react";
import ZoneDashboard from "./components/ZoneDashboard";
import MeterDashboard from "./components/MeterDashboard";
import ExplanationPanel from "./components/ExplanationPanel";

function App() {
  const [screen, setScreen] = useState("zone");

  return (
    <div style={{ fontFamily: "Arial", padding: "20px" }}>
      
      <h1 style={{ textAlign: "center" }}>⚡ MeterSy Dashboard</h1>

      {/* Tabs */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "20px",
        marginBottom: "20px"
      }}>
        <button onClick={() => setScreen("zone")}>Zone</button>
        <button onClick={() => setScreen("meter")}>Meter</button>
        <button onClick={() => setScreen("explain")}>Explain</button>
      </div>

      {/* Screens */}
      {screen === "zone" && <ZoneDashboard />}
      {screen === "meter" && <MeterDashboard />}
      {screen === "explain" && <ExplanationPanel />}
    </div>
  );
}

export default App;