import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StepGym from '../components/Wizard/StepGym';

describe('StepGym Component', () => {
  const mockUpdateFormData = vi.fn();
  const mockPrevStep = vi.fn();
  const mockNextStep = vi.fn();

  const emptyFormData = {
    gymName: '',
    gymLocation: '',
    trainingEnv: '',
    daysPerWeek: '',
    sessionLength: ''
  };

  const completeFormData = {
    gymName: "Gold's Gym",
    gymLocation: 'New York, NY',
    trainingEnv: 'full_gym',
    daysPerWeek: '4',
    sessionLength: '60'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and disables Next button initially', () => {
    render(
      <StepGym
        formData={emptyFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    expect(screen.getByText('Training Environment')).toBeInTheDocument();
    expect(screen.getByText('Where do you train?')).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /Next Step/i });
    expect(nextBtn).toBeDisabled();
  });

  it('calls updateFormData when selecting training environment', () => {
    render(
      <StepGym
        formData={emptyFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    fireEvent.click(screen.getByText('Home (Basic)'));
    expect(mockUpdateFormData).toHaveBeenCalledWith('trainingEnv', 'home_basic');
  });

  it('calls updateFormData when entering gym details', () => {
    render(
      <StepGym
        formData={emptyFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Gold's Gym Downtown/i);
    fireEvent.change(nameInput, { target: { value: 'My Gym' } });
    expect(mockUpdateFormData).toHaveBeenCalledWith('gymName', 'My Gym');

    const locationInput = screen.getByPlaceholderText(/Baku, AZ/i);
    fireEvent.change(locationInput, { target: { value: 'LA' } });
    expect(mockUpdateFormData).toHaveBeenCalledWith('gymLocation', 'LA');
  });

  it('calls updateFormData when selecting days per week', () => {
    render(
      <StepGym
        formData={emptyFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    fireEvent.click(screen.getByText('4 days'));
    expect(mockUpdateFormData).toHaveBeenCalledWith('daysPerWeek', '4');
  });

  it('calls updateFormData when selecting session duration', () => {
    render(
      <StepGym
        formData={emptyFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    fireEvent.click(screen.getByText('60 min'));
    expect(mockUpdateFormData).toHaveBeenCalledWith('sessionLength', '60');
  });

  it('calls prevStep when Back button is clicked', () => {
    render(
      <StepGym
        formData={emptyFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(mockPrevStep).toHaveBeenCalled();
  });

  it('calls nextStep when form is completed and Next is clicked', () => {
    render(
      <StepGym
        formData={completeFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const nextBtn = screen.getByRole('button', { name: /Next Step/i });
    expect(nextBtn).not.toBeDisabled();

    // It's a form submit, so we should click the next button to submit
    fireEvent.click(nextBtn);
    expect(mockNextStep).toHaveBeenCalled();
  });
});
