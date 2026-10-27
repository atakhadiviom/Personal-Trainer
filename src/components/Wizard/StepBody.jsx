import React from 'react';

const StepBody = ({ formData, updateFormData, nextStep }) => {
  const goals = [
    { id: 'muscle', label: 'Build Muscle' },
    { id: 'fatloss', label: 'Lose Fat' },
    { id: 'endurance', label: 'Endurance' },
    { id: 'strength', label: 'Raw Strength' },
    { id: 'recomp', label: 'Body Recomp' }
  ];

  const levels = [
    { id: 'beginner', label: 'Beginner (0-6 mo)' },
    { id: 'intermediate', label: 'Intermediate (6mo-2yr)' },
    { id: 'advanced', label: 'Advanced (2+ yr)' }
  ];

  const canProceed = formData.age && formData.weight && formData.height && formData.gender && formData.goal && formData.fitnessLevel;

  const handleNext = (e) => {
    e.preventDefault();
    if (canProceed) nextStep();
  };

  return (
    <form onSubmit={handleNext}>
      <h2 className="step-title">Your Body & Goal</h2>
      <p className="step-subtitle">Every detail here shapes your 12-week plan.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Age</label>
          <input type="number" required placeholder="25" min="14" max="80"
            value={formData.age} onChange={(e) => updateFormData('age', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Gender</label>
          <select required value={formData.gender} onChange={(e) => updateFormData('gender', e.target.value)}>
            <option value="" disabled>Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Current Weight (kg)</label>
          <input type="number" required placeholder="75" min="30" max="300"
            value={formData.weight} onChange={(e) => updateFormData('weight', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Height (cm)</label>
          <input type="number" required placeholder="180" min="100" max="250"
            value={formData.height} onChange={(e) => updateFormData('height', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Target Weight (kg)</label>
          <input type="number" placeholder="70" min="30" max="300"
            value={formData.targetWeight || ''} onChange={(e) => updateFormData('targetWeight', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Body Fat % (if known)</label>
          <input type="number" placeholder="20" min="3" max="60"
            value={formData.bodyFat || ''} onChange={(e) => updateFormData('bodyFat', e.target.value)} />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Primary Goal</label>
        <div className="selection-grid">
          {goals.map(goal => (
            <div key={goal.id}
              className={`selection-card ${formData.goal === goal.id ? 'active' : ''}`}
              role="button" tabIndex={0} aria-pressed={!!(formData.goal === goal.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (() => updateFormData('goal', goal.id))(); } }}
              onClick={() => updateFormData('goal', goal.id)}>
              <span>{goal.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Describe your exact goal</label>
        <textarea
          placeholder="e.g., I want to lose 10kg before my wedding in August, or I want visible abs by summer, or I need to bench press 100kg..."
          rows="3"
          value={formData.exactGoal || ''}
          onChange={(e) => updateFormData('exactGoal', e.target.value)}
        />
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Gym Experience Level</label>
        <div className="selection-grid">
          {levels.map(level => (
            <div key={level.id}
              className={`selection-card ${formData.fitnessLevel === level.id ? 'active' : ''}`}
              role="button" tabIndex={0} aria-pressed={!!(formData.fitnessLevel === level.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (() => updateFormData('fitnessLevel', level.id))(); } }}
              onClick={() => updateFormData('fitnessLevel', level.id)}>
              <span>{level.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
        <button type="submit" className="btn-primary" disabled={!canProceed}>
          Next Step <span>→</span>
        </button>
      </div>
    </form>
  );
};

export default StepBody;
