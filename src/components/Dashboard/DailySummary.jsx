import MacroRing from './MacroRing';

const DailySummary = ({ today, totalCals, finalTargetCals, totalPro, targetPro, totalCarbs, targetCarbs, totalFat, targetFat, fitSteps, fitCalsBurned, plateauAlert }) => {
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

export default DailySummary;
