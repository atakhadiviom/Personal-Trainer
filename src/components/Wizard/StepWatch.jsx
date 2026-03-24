import React, { useState } from 'react';

const StepWatch = ({ formData, updateFormData, prevStep, nextStep }) => {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setConnecting(true);
    // Simulate a Bluetooth or OAuth connection delay
    setTimeout(() => {
      setConnecting(false);
      updateFormData('watchConnected', true);
    }, 2500);
  };

  return (
    <div className="animate-fade-in">
      <h2 className="step-title">Sync Your Smart Watch</h2>
      <p className="step-subtitle">Connect your device to automatically calibrate calorie targets and track biometrics.</p>
      
      <div style={{ textAlign: 'center', margin: '40px 0' }}>
        {formData.watchConnected ? (
          <div>
            <div style={{ fontSize: '4rem', marginBottom: '16px', color: 'var(--accent-cyan)' }}>⌚✓</div>
            <h3 style={{ color: 'var(--accent-cyan)' }}>Watch Connected successfully!</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Biometrics synced and ready.</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '4rem', marginBottom: '16px', animation: connecting ? 'pulse-glow 1.5s infinite' : 'none', borderRadius: '50%', display: 'inline-block', width: '100px', height: '100px', lineHeight: '100px', background: 'rgba(255,255,255,0.05)' }}>⌚</div>
            <br />
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleConnect}
              disabled={connecting}
              style={{ padding: '16px 32px', marginTop: '16px' }}
            >
              {connecting ? 'Syncing health data...' : 'Connect Apple Watch / Garmin'}
            </button>
          </div>
        )}
      </div>

      <div className="btn-group">
        <button type="button" className="btn-secondary" onClick={prevStep} disabled={connecting}>
          <span>←</span> Back
        </button>
        <button type="button" className="btn-primary" onClick={nextStep} disabled={connecting}>
          {formData.watchConnected ? 'Generate Plan ✨' : 'Skip & Generate Plan'}
        </button>
      </div>
    </div>
  );
};

export default StepWatch;
