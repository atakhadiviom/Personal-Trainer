import React from 'react';

const StepGym = ({ formData, updateFormData, prevStep, nextStep }) => {
  const handleNext = (e) => {
    e.preventDefault();
    nextStep();
  };

  return (
    <form onSubmit={handleNext}>
      <h2 className="step-title">Your Environment</h2>
      <p className="step-subtitle">Tell us where you train so we can optimize for the equipment available there.</p>
      
      <div className="form-group">
        <label className="form-label">Gym Name</label>
        <input 
          type="text" 
          required 
          placeholder="e.g., Planet Fitness, Gold's Gym..."
          value={formData.gymName}
          onChange={(e) => updateFormData('gymName', e.target.value)} 
        />
      </div>

      <div className="form-group">
        <label className="form-label">Location (City or Branch)</label>
        <input 
          type="text" 
          required 
          placeholder="e.g., Downtown LA or Home Garage"
          value={formData.gymLocation}
          onChange={(e) => updateFormData('gymLocation', e.target.value)} 
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

export default StepGym;
