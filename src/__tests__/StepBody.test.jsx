import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StepBody from '../components/Wizard/StepBody';

describe('StepBody Component', () => {
  const defaultFormData = {
    age: '25',
    gender: 'male',
    weight: '75',
    height: '180',
    targetWeight: '70',
    bodyFat: '15',
    goal: 'muscle',
    exactGoal: 'I want to build muscle',
    fitnessLevel: 'intermediate'
  };

  it('renders all inputs correctly with provided formData', () => {
    render(<StepBody formData={defaultFormData} updateFormData={vi.fn()} nextStep={vi.fn()} />);

    expect(screen.getByPlaceholderText('25')).toHaveValue(25);
    expect(screen.getByRole('combobox')).toHaveValue('male');
    expect(screen.getByPlaceholderText('75')).toHaveValue(75);
    expect(screen.getByPlaceholderText('180')).toHaveValue(180);
    expect(screen.getByPlaceholderText('70')).toHaveValue(70);
    expect(screen.getByPlaceholderText('20')).toHaveValue(15);
    expect(screen.getByPlaceholderText(/I want to lose 10kg/i)).toHaveValue('I want to build muscle');
  });

  it('calls updateFormData when changing input values', async () => {
    const updateFormData = vi.fn();
    render(<StepBody formData={defaultFormData} updateFormData={updateFormData} nextStep={vi.fn()} />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('25'), { target: { value: '26' } });
    });
    expect(updateFormData).toHaveBeenCalledWith('age', '26');

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'female' } });
    });
    expect(updateFormData).toHaveBeenCalledWith('gender', 'female');
  });

  it('calls updateFormData when clicking goal and fitness level cards', async () => {
    const updateFormData = vi.fn();
    render(<StepBody formData={defaultFormData} updateFormData={updateFormData} nextStep={vi.fn()} />);

    const fatLossGoal = screen.getByText('Lose Fat');
    await act(async () => {
      fireEvent.click(fatLossGoal);
    });
    expect(updateFormData).toHaveBeenCalledWith('goal', 'fatloss');

    const advancedLevel = screen.getByText('Advanced (2+ yr)');
    await act(async () => {
      fireEvent.click(advancedLevel);
    });
    expect(updateFormData).toHaveBeenCalledWith('fitnessLevel', 'advanced');
  });

  it('disables the submit button when required fields are missing', () => {
    const incompleteFormData = { ...defaultFormData, age: '' };
    render(<StepBody formData={incompleteFormData} updateFormData={vi.fn()} nextStep={vi.fn()} />);

    const submitButton = screen.getByRole('button', { name: /Next Step/i });
    expect(submitButton).toBeDisabled();
  });

  it('calls nextStep when submitting the form and all required fields are present', async () => {
    const nextStep = vi.fn();
    render(<StepBody formData={defaultFormData} updateFormData={vi.fn()} nextStep={nextStep} />);

    const submitButton = screen.getByRole('button', { name: /Next Step/i });
    expect(submitButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.submit(submitButton.closest('form'));
    });

    expect(nextStep).toHaveBeenCalled();
  });
});
