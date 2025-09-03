import React from "react";

type Props = { active: 0 | 1 | 2 };

// Shared layout for the stepper across all three screens
const WRAP: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 16,
};

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 24,
  width: 480,            // fixed width to keep the stepper aligned across screens
  alignItems: "center",
};

// Generates the circular step dot style; highlighted when `on` is true
const DOT = (on: boolean): React.CSSProperties => ({
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: on ? "#f65e5a" : "#ccc",
  color: "#fff",
  lineHeight: "28px",
  textAlign: "center",
  fontWeight: 600,
  margin: "0 auto",
});

// Label style below each dot; highlighted when the step is active
const LABEL = (on: boolean): React.CSSProperties => ({
  marginTop: 6,
  color: on ? "#f65e5a" : "#888",
  fontSize: 13,
  textAlign: "center",
});

// Simple 3-step indicator. `active` selects which step is highlighted (0, 1, or 2).
const Steps: React.FC<Props> = ({ active }) => {
  const steps = ["Začetek", "Naslov", "Podrobnosti"]; // step captions (kept as provided)
  return (
    <div style={WRAP}>
      <div style={GRID}>
        {steps.map((s, i) => (
          <div key={s}>
            <div style={DOT(i === active)}>{i + 1}</div>
            <div style={LABEL(i === active)}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Steps;
