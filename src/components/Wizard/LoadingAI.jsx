import React from 'react';

const LoadingAI = () => {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }} className="animate-fade-in">
      <div className="loader" style={{ 
        width: '60px', 
        height: '60px', 
        border: '4px solid rgba(255,255,255,0.1)',
        borderTop: '4px solid var(--accent-cyan)',
        borderRadius: '50%',
        margin: '0 auto 32px auto',
        animation: 'spin 1s linear infinite, pulse-glow 2s infinite'
      }} />
      <h2 className="step-title gradient-text">Designing Your Program...</h2>
      <p className="step-subtitle" style={{marginTop: '16px'}}>
        NovaFit AI is analyzing your profile, taking into account your injuries, and adapting to the equipment available at your gym.
      </p>
    </div>
  );
};

export default LoadingAI;
