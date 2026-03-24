import React from 'react';

const StepBody = ({ formData, updateFormData, nextStep }) => {
  const goals = [
    { id: 'muscle', icon: '💪', label: 'Build Muscle' },
    { id: 'fatloss', icon: '🔥', label: 'Lose Fat' },
    { id: 'endurance', icon: '🏃', label: 'Endurance' }
  ];

  const handleNext = (e) => {
    e.preventDefault();
    nextStep();
  };

  return (
    <form onSubmit={handleNext}>
      <h2 className="step-title">Tell us about yourself</h2>
      <p className="step-subtitle">This helps NovaFit tailor the perfect plan for your body.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Age</label>
          <input 
            type="number" 
            required 
            placeholder="25"
            value={formData.age}
            onChange={(e) => updateFormData('age', e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Gender</label>
          <select 
            required
            value={formData.gender}
            onChange={(e) => updateFormData('gender', e.target.value)}
          >
            <option value="" disabled>Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Weight (kg)</label>
          <input 
            type="number" 
            required 
            placeholder="75"
            value={formData.weight}
            onChange={(e) => updateFormData('weight', e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Height (cm)</label>
          <input 
            type="number" 
            required 
            placeholder="180"
            value={formData.height}
            onChange={(e) => updateFormData('height', e.target.value)} 
          />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Primary Goal</label>
        <div className="selection-grid">
          {goals.map(goal => (
            <div 
              key={goal.id}
              className={`selection-card ${formData.goal === goal.id ? 'active' : ''}`}
              onClick={() => updateFormData('goal', goal.id)}
            >
              <div className="selection-icon">{goal.icon}</div>
              <span>{goal.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
        <button type="submit" className="btn-primary" disabled={!formData.goal}>
          Next Step <span>→</span>
        </button>
      </div>
    </form>
  );
};

export default StepBody;
