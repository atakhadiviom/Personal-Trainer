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

export default MacroRing;
