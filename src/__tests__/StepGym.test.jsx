import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepGym from '../components/Wizard/StepGym';

describe('StepGym Component', () => {
  const mockUpdateFormData = vi.fn();
  const mockNextStep = vi.fn();
  const mockPrevStep = vi.fn();

  const defaultProps = {
    formData: {},
    updateFormData: mockUpdateFormData,
    prevStep: mockPrevStep,
    nextStep: mockNextStep,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all environment options and input fields', () => {
    render(<StepGym {...defaultProps} />);

    expect(screen.getByText('Training Environment')).toBeInTheDocument();
    expect(screen.getByText('Full Gym')).toBeInTheDocument();
    expect(screen.getByText('Home (Basic)')).toBeInTheDocument();
    expect(screen.getByText('Home (Full Setup)')).toBeInTheDocument();
    expect(screen.getByText('Outdoor / Park')).toBeInTheDocument();
    expect(screen.getByText('Hotel / Travel')).toBeInTheDocument();

    expect(screen.getByPlaceholderText("e.g., Gold's Gym Downtown")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Baku, AZ')).toBeInTheDocument();

    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByText('6 days')).toBeInTheDocument();

    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('90 min')).toBeInTheDocument();
  });

  it('disables Next Step button when formData is incomplete', () => {
    render(<StepGym {...defaultProps} formData={{ gymName: 'Golds' }} />);

    const nextButton = screen.getByRole('button', { name: /Next Step/i });
    expect(nextButton).toBeDisabled();
  });

  it('enables Next Step button when required fields are filled', () => {
    const completeData = {
      gymName: "Gold's Gym",
      trainingEnv: 'full_gym',
      daysPerWeek: '4',
      sessionLength: '60'
    };

    render(<StepGym {...defaultProps} formData={completeData} />);

    const nextButton = screen.getByRole('button', { name: /Next Step/i });
    expect(nextButton).not.toBeDisabled();
  });

  it('calls updateFormData when selecting training environment', async () => {
    const user = userEvent.setup();
    render(<StepGym {...defaultProps} />);

    await user.click(screen.getByText('Home (Basic)'));
    expect(mockUpdateFormData).toHaveBeenCalledWith('trainingEnv', 'home_basic');
  });

  it('calls updateFormData when typing gym name', async () => {
    const user = userEvent.setup();
    render(<StepGym {...defaultProps} />);

    const input = screen.getByPlaceholderText("e.g., Gold's Gym Downtown");
    await user.type(input, 'Planet');

    expect(mockUpdateFormData).toHaveBeenCalledWith('gymName', 'P');
  });

  it('calls updateFormData when selecting days per week', async () => {
    const user = userEvent.setup();
    render(<StepGym {...defaultProps} />);

    await user.click(screen.getByText('4 days'));
    expect(mockUpdateFormData).toHaveBeenCalledWith('daysPerWeek', '4');
  });

  it('calls updateFormData when selecting session duration', async () => {
    const user = userEvent.setup();
    render(<StepGym {...defaultProps} />);

    await user.click(screen.getByText('45 min'));
    expect(mockUpdateFormData).toHaveBeenCalledWith('sessionLength', '45');
  });

  it('calls nextStep when clicking Next Step with valid data', async () => {
    const completeData = {
      gymName: "Gold's Gym",
      trainingEnv: 'full_gym',
      daysPerWeek: '4',
      sessionLength: '60'
    };

    render(<StepGym {...defaultProps} formData={completeData} />);

    // Using fireEvent since it's a form submission
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    expect(mockNextStep).toHaveBeenCalled();
  });

  it('calls prevStep when clicking Back', async () => {
    const user = userEvent.setup();
    render(<StepGym {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Back/i }));
    expect(mockPrevStep).toHaveBeenCalled();
  });
});
