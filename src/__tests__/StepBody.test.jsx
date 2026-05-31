import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepBody from '../components/Wizard/StepBody';

describe('StepBody Component', () => {
  const mockUpdateFormData = vi.fn();
  const mockNextStep = vi.fn();

  const defaultFormData = {
    age: '',
    gender: '',
    weight: '',
    height: '',
    targetWeight: '',
    bodyFat: '',
    goal: '',
    exactGoal: '',
    fitnessLevel: ''
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields and options', () => {
    render(
      <StepBody
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        nextStep={mockNextStep}
      />
    );

    expect(screen.getByText('Your Body & Goal')).toBeInTheDocument();

    // Check inputs
    // Using placeholder/display values since labels don't have htmlFor linking
    expect(screen.getByPlaceholderText('25')).toBeInTheDocument(); // Age
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // Gender
    expect(screen.getByPlaceholderText('75')).toBeInTheDocument(); // Weight
    expect(screen.getByPlaceholderText('180')).toBeInTheDocument(); // Height
    expect(screen.getByPlaceholderText('70')).toBeInTheDocument(); // Target Weight
    expect(screen.getByPlaceholderText('20')).toBeInTheDocument(); // Body Fat
    expect(screen.getByPlaceholderText(/e\.g\., I want to lose/i)).toBeInTheDocument(); // Exact goal

    // Check Goal selections
    expect(screen.getByText('Build Muscle')).toBeInTheDocument();
    expect(screen.getByText('Lose Fat')).toBeInTheDocument();
    expect(screen.getByText('Endurance')).toBeInTheDocument();
    expect(screen.getByText('Raw Strength')).toBeInTheDocument();
    expect(screen.getByText('Body Recomp')).toBeInTheDocument();

    // Check Fitness Level selections
    expect(screen.getByText('Beginner (0-6 mo)')).toBeInTheDocument();
    expect(screen.getByText('Intermediate (6mo-2yr)')).toBeInTheDocument();
    expect(screen.getByText('Advanced (2+ yr)')).toBeInTheDocument();

    // Check button
    const nextButton = screen.getByRole('button', { name: /Next Step/i });
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
  });

  it('calls updateFormData on input changes', async () => {
    const user = userEvent.setup();
    render(
      <StepBody
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        nextStep={mockNextStep}
      />
    );

    const ageInput = screen.getByPlaceholderText('25');
    await user.type(ageInput, '25');
    expect(mockUpdateFormData).toHaveBeenCalledWith('age', '2'); // First character typed
    expect(mockUpdateFormData).toHaveBeenCalledWith('age', '5'); // Second character typed

    const genderSelect = screen.getByRole('combobox');
    await user.selectOptions(genderSelect, 'male');
    expect(mockUpdateFormData).toHaveBeenCalledWith('gender', 'male');

    const exactGoalInput = screen.getByPlaceholderText(/e\.g\., I want to lose/i);
    await user.type(exactGoalInput, 'test');
    expect(mockUpdateFormData).toHaveBeenCalledWith('exactGoal', 't');
  });

  it('calls updateFormData when selecting goals and fitness levels', async () => {
    const user = userEvent.setup();
    render(
      <StepBody
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        nextStep={mockNextStep}
      />
    );

    // Click a goal
    const muscleGoal = screen.getByText('Build Muscle').closest('.selection-card');
    await user.click(muscleGoal);
    expect(mockUpdateFormData).toHaveBeenCalledWith('goal', 'muscle');

    // Click a fitness level
    const advancedLevel = screen.getByText('Advanced (2+ yr)').closest('.selection-card');
    await user.click(advancedLevel);
    expect(mockUpdateFormData).toHaveBeenCalledWith('fitnessLevel', 'advanced');
  });

  it('disables next button when required fields are missing', () => {
    const partialFormData = {
      ...defaultFormData,
      age: '25',
      weight: '75'
      // missing height, gender, goal, fitnessLevel
    };

    render(
      <StepBody
        formData={partialFormData}
        updateFormData={mockUpdateFormData}
        nextStep={mockNextStep}
      />
    );

    const nextButton = screen.getByRole('button', { name: /Next Step/i });
    expect(nextButton).toBeDisabled();
  });

  it('enables next button and calls nextStep when form is valid', async () => {
    const user = userEvent.setup();
    const validFormData = {
      ...defaultFormData,
      age: '25',
      weight: '75',
      height: '180',
      gender: 'male',
      goal: 'muscle',
      fitnessLevel: 'intermediate'
    };

    render(
      <StepBody
        formData={validFormData}
        updateFormData={mockUpdateFormData}
        nextStep={mockNextStep}
      />
    );

    const nextButton = screen.getByRole('button', { name: /Next Step/i });
    expect(nextButton).not.toBeDisabled();

    await user.click(nextButton);
    expect(mockNextStep).toHaveBeenCalled();
  });
});
