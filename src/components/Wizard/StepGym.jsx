import React from 'react';

const StepGym = ({ formData, updateFormData, prevStep, nextStep }) => {
  const environments = [
    { id: 'full_gym', icon: '🏋️', label: 'Full Gym' },
    { id: 'home_basic', icon: '🏠', label: 'Home (Basic)' },
    { id: 'home_advanced', icon: '🔧', label: 'Home (Full Setup)' },
    { id: 'outdoor', icon: '🌳', label: 'Outdoor / Park' },
    { id: 'hotel', icon: '🏨', label: 'Hotel / Travel' }
  ];

  const daysPerWeek = [
    { id: '3', label: '3 days' },
    { id: '4', label: '4 days' },
    { id: '5', label: '5 days' },
    { id: '6', label: '6 days' }
  ];

  const sessionLengths = [
    { id: '30', label: '30 min' },
    { id: '45', label: '45 min' },
    { id: '60', label: '60 min' },
    { id: '90', label: '90 min' }
  ];

  const canProceed = formData.gymName && formData.trainingEnv && formData.daysPerWeek && formData.sessionLength;

  const handleNext = (e) => {
    e.preventDefault();
    if (canProceed) nextStep();
  };

  return (
    <form onSubmit={handleNext}>
      <h2 className="step-title">Training Environment</h2>
      <p className="step-subtitle">We tailor exercises to your available equipment and schedule.</p>
      
      <div className="form-group">
        <label className="form-label">Where do you train?</label>
        <div className="selection-grid">
          {environments.map(env => (
            <div key={env.id}
              className={`selection-card ${formData.trainingEnv === env.id ? 'active' : ''}`}
              onClick={() => updateFormData('trainingEnv', env.id)}>
              <div className="selection-icon">{env.icon}</div>
              <span>{env.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        <div className="form-group">
          <label className="form-label">Gym / Location Name</label>
          <input type="text" required placeholder="e.g., Gold's Gym Downtown"
            value={formData.gymName} onChange={(e) => updateFormData('gymName', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">City (Optional)</label>
          <input type="text" placeholder="e.g., Baku, AZ"
            value={formData.gymLocation || ''} onChange={(e) => updateFormData('gymLocation', e.target.value)} />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Days Per Week</label>
        <div className="selection-grid">
          {daysPerWeek.map(d => (
            <div key={d.id}
              className={`selection-card ${formData.daysPerWeek === d.id ? 'active' : ''}`}
              onClick={() => updateFormData('daysPerWeek', d.id)}>
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Session Duration</label>
        <div className="selection-grid">
          {sessionLengths.map(s => (
            <div key={s.id}
              className={`selection-card ${formData.sessionLength === s.id ? 'active' : ''}`}
              onClick={() => updateFormData('sessionLength', s.id)}>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="btn-group">
        <button type="button" className="btn-secondary" onClick={prevStep}>
          <span>←</span> Back
        </button>
        <button type="submit" className="btn-primary" disabled={!canProceed}>
          Next Step <span>→</span>
        </button>
      </div>
    </form>
  );
};

export default StepGym;
