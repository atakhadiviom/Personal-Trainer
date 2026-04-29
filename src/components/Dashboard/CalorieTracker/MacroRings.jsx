export const MacroRings = ({
  today,
  totalCals,
  finalTargetCals,
  totalPro,
  targetPro,
  totalCarbs,
  targetCarbs,
  totalFat,
  targetFat,
  fitSteps,
  fitCalsBurned,
  plateauAlert
}) => {
  return (
    <div className="section-card" style={{ borderTop: '4px solid var(--accent-green)', flexShrink: 0 }}>
      <div className="section-header"><h3 style={{ color: 'var(--accent-green)' }}>🔥 Today — {today}</h3></div>
      <div className="macro-rings">
        <MacroRing label="Calories" current={totalCals} target={finalTargetCals} color="var(--accent-orange)" unit="kcal" />
        <MacroRing label="Protein" current={totalPro} target={targetPro} color="var(--accent-green)" unit="g" />
        <MacroRing label="Carbs" current={totalCarbs} target={targetCarbs} color="var(--accent-cyan)" unit="g" />
        <MacroRing label="Fat" current={totalFat} target={targetFat} color="var(--accent-purple)" unit="g" />
      </div>
      {/* Feature 1: Step calorie sync */}
      {fitSteps != null && fitSteps > 0 && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>🚶 Steps bonus</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e8a838' }}>+{Math.round(fitSteps * 0.04)} kcal from {fitSteps.toLocaleString()} steps</span>
        </div>
      )}
      {/* Feature 4: Smart hydration target */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>💧 Hydration goal</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-blue)' }}>{(fitCalsBurned || 0) > 500 ? '3.0' : '2.5'}L today{(fitCalsBurned || 0) > 500 ? ' (+0.5L for activity)' : ''}</span>
      </div>
      {/* Feature 11: Plateau alert */}
      {plateauAlert && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(232,168,56,0.3)', background: 'rgba(232,168,56,0.06)', borderRadius: '0 0 var(--r-md) var(--r-md)' }}>
          <span style={{ fontSize: '0.82rem', color: '#e8a838' }}>📊 Plateau Alert — You've been at target calories for 7 days. Consider a 200 kcal reduction or a refeed day.</span>
        </div>
      )}
    </div>
  );
};

const MacroRing = ({ label, current, target, color, unit }) => {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="macro-ring-card">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        <text x="50" y="46" textAnchor="middle" fill="#fff" fontSize="16" fontFamily="Outfit" fontWeight="700">{current}</text>
        <text x="50" y="62" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">/ {target}{unit}</text>
      </svg>
      <span className="macro-ring-label">{label}</span>
    </div>
  );
};

export default MacroRings;