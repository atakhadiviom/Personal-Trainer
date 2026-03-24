import React from 'react';

const StepProblems = ({ formData, updateFormData, prevStep, nextStep }) => {
  const handleNext = (e) => {
    e.preventDefault();
    nextStep();
  };

  return (
    <form onSubmit={handleNext}>
      <h2 className="step-title">Any Limitations?</h2>
      <p className="step-subtitle">Let NovaFit know about any injuries, medical conditions, or exercises you want to avoid.</p>
      
      <div className="form-group">
        <label className="form-label">Injuries & Medical Problems (Optional)</label>
        <textarea 
          placeholder="e.g., lower back pain, bad knees, recovering from shoulder surgery..."
          rows="5"
          value={formData.problems}
          onChange={(e) => updateFormData('problems', e.target.value)} 
        />
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
