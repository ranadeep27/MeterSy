# ⚡ MeterSy — Smart Meter Intelligence & Demand Prediction System

🔗 Live Demo: https://metersy.vercel.app/  
💻 Repository: https://github.com/ranadeep27/MeterSy  

---

## 🚀 Overview

MeterSy is an AI-driven **decision support system** that combines:

- 📈 Demand Prediction (Zone Level)  
- ⚠️ Anomaly & Theft Detection (Meter Level)  
- 🧠 Explainable Intelligence  

It transforms smart meter data into **actionable insights for utilities like BESCOM**, enabling smarter grid monitoring and faster decision-making.

---

## 💡 Core Idea

Instead of detecting anomalies blindly, MeterSy follows:

Predicted Demand → Baseline  
Actual Consumption → Observed  
Deviation → Anomaly  

👉 Anomalies are detected **relative to prediction, not just magnitude**

---

## 🧠 How It Works

MeterSy builds intelligence using three perspectives :contentReference[oaicite:0]{index=0}:

- **Temporal Intelligence** → usage patterns over time  
- **Peer Intelligence** → comparison with similar households  
- **Relational Intelligence** → behavior across nearby meters  

These combined signals allow accurate detection of fraud while avoiding false positives.

---

## 📊 System Layers

### 🔹 Zone Dashboard (Demand Prediction)
- Forecasts electricity demand  
- Compares **actual vs predicted usage**  
- Computes **Load Score** → Safe / Warning / High Risk  
- Identifies high-risk zones  

---

### 🔹 Meter Dashboard (Anomaly Detection)

Classifies meters into:

- 🚨 **Fraud**
  - Sudden drops / bypass / tampering  

- ⚡ **High Usage (Events)**
  - Spikes due to overload, gatherings  

- ✅ **Safe / Vacation**
  - Stable low consumption (avoids false alarms)  

---

## 🔍 Real-World Handling

MeterSy correctly distinguishes:

- Vacation vs Fraud  
- Party vs Theft  
- Seasonal changes vs anomalies  
- Meter faults vs actual fraud  

👉 Reduces false positives significantly

---

## 📈 Scoring System

- **Load Score** → Demand risk  
- **Fraud Score** → Theft likelihood  
- **Event Score** → Valid usage spikes  

Each output includes:
- Confidence score  
- Explanation  
- Key contributing factors  

---

## 🧠 Explainability

Every decision is:
- Transparent  
- Auditable  
- Human-readable  

👉 Not a black-box system

---

## 🛠️ Tech Stack

- React.js  
- Recharts  
- CSV-based simulation  
- Vercel  

---

## ⚙️ Run Locally

```bash
git clone https://github.com/ranadeep27/MeterSy.git
cd MeterSy
npm install
npm start