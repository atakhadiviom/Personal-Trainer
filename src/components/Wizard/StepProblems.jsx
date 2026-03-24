import React from 'react';

const StepProblems = ({ formData, updateFormData, prevStep, nextStep }) => {
  const commonInjuries = [
    { id: 'back', label: '🔙 Lower Back' },
    { id: 'knees', label: '🦵 Knees' },
    { id: 'shoulders', label: '💪 Shoulders' },
    { id: 'wrists', label: '🤚 Wrists' },
    { id: 'neck', label: '🧣 Neck' },
    { id: 'none', label: '✅ No Issues' }
  ];

  const dietOptions = [
    { id: 'no_restriction', label: 'No Restrictions' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'vegan', label: 'Vegan' },
    { id: 'keto', label: 'Keto / Low Carb' },
    { id: 'halal', label: 'Halal' },
    { id: 'gluten_free', label: 'Gluten Free' }
  ];

  const dietControlLevels = [
    { id: 'strict', icon: '🎯', label: 'Strict — I follow macros precisely' },
    { id: 'moderate', icon: '⚖️', label: 'Moderate — I eat mostly clean' },
    { id: 'low', icon: '🍕', label: 'Low — I struggle with diet' }
  ];

  const sleepOptions = [
    { id: 'less5', label: '< 5 hours' },
    { id: '5to6', label: '5-6 hours' },
    { id: '7to8', label: '7-8 hours' },
    { id: 'more8', label: '8+ hours' }
  ];

  const toggleInjury = (id) => {
    const current = formData.injuryAreas || [];
    if (id === 'none') {
      updateFormData('injuryAreas', ['none']);
      return;
    }
    const filtered = current.filter(i => i !== 'none');
    const updated = filtered.includes(id) ? filtered.filter(i => i !== id) : [...filtered, id];
    updateFormData('injuryAreas', updated);
  };

  const handleNext = (e) => {
    e.preventDefault();
    nextStep();
  };

  return (
    <form onSubmit={handleNext}>
      <h2 className="step-title">Health, Diet & Lifestyle</h2>
      <p className="step-subtitle">These details help NovaFit build a plan you can actually stick to.</p>
      
      <div className="form-group">
        <label className="form-label">Problem Areas (tap all that apply)</label>
        <div className="selection-grid">
          {commonInjuries.map(injury => (
            <div key={injury.id}
              className={`selection-card ${(formData.injuryAreas || []).includes(injury.id) ? 'active' : ''}`}
              onClick={() => toggleInjury(injury.id)}>
              <span>{injury.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Additional Medical Notes (Optional)</label>
        <textarea
          placeholder="e.g., recovering from ACL surgery, asthma, high blood pressure..."
          rows="2"
          value={formData.problems}
          onChange={(e) => updateFormData('problems', e.target.value)}
        />
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Dietary Preference</label>
        <div className="selection-grid">
          {dietOptions.map(diet => (
            <div key={diet.id}
              className={`selection-card ${formData.dietPreference === diet.id ? 'active' : ''}`}
              onClick={() => updateFormData('dietPreference', diet.id)}>
              <span>{diet.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">How strict are you with diet?</label>
        <div className="selection-grid">
          {dietControlLevels.map(level => (
            <div key={level.id}
              className={`selection-card ${formData.dietControl === level.id ? 'active' : ''}`}
              onClick={() => updateFormData('dietControl', level.id)}>
              <div className="selection-icon">{level.icon}</div>
              <span>{level.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Average Sleep Per Night</label>
        <div className="selection-grid">
          {sleepOptions.map(s => (
            <div key={s.id}
              className={`selection-card ${formData.sleepHours === s.id ? 'active' : ''}`}
              onClick={() => updateFormData('sleepHours', s.id)}>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="btn-group">
        <button type="button" className="btn-secondary" onClick={prevStep}>
          <span>←</span> Back
        </button>
        <button type="submit" className="btn-primary">
          Next Step <span>→</span>
        </button>
      </div>
    </form>
  );
};

export default StepProblems;
