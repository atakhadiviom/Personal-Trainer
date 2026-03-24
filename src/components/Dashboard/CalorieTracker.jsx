import React from 'react';

const CalorieTracker = ({ formData }) => {
  // Simple mock logic for calorie computation
  const weight = parseInt(formData.weight) || 75;
  const isLoss = formData.goal === 'fatloss';
  
  const dailyCals = isLoss ? weight * 22 : weight * 30; // very rough estimate
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: 'rgba(255, 255, 255, 0.1)',
      padding: '8px 16px',
      borderRadius: '30px',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--border-card)',
      fontSize: '0.9rem'
    }}>
      <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
        🔥 {dailyCals} kcal
      </div>
      <div style={{ paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.2)', display: 'flex', gap: '8px' }}>
        <span style={{ color: '#ffb347' }}>P: {Math.round(weight * 2)}g</span>
        <span style={{ color: '#85d9ff' }}>C: {Math.round((dailyCals * 0.4) / 4)}g</span>
        <span style={{ color: '#ff6b6b' }}>F: {Math.round((dailyCals * 0.25) / 9)}g</span>
      </div>
    </div>
  );
};

export default CalorieTracker;
