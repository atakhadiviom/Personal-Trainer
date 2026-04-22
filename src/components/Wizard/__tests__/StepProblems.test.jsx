import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepProblems from '../StepProblems';

describe('StepProblems Component', () => {
  const defaultProps = {
    formData: {},
    updateFormData: vi.fn(),
    prevStep: vi.fn(),
    nextStep: vi.fn(),
  };

  it('renders all form sections correctly', () => {
    render(<StepProblems {...defaultProps} />);

    expect(screen.getByText('Health, Diet & Lifestyle')).toBeInTheDocument();
    expect(screen.getByText('Problem Areas (tap all that apply)')).toBeInTheDocument();
    expect(screen.getByText('Additional Medical Notes (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Dietary Preference')).toBeInTheDocument();
    expect(screen.getByText('How strict are you with diet?')).toBeInTheDocument();
    expect(screen.getByText('Average Sleep Per Night')).toBeInTheDocument();
  });

  it('handles injury selection and toggling correctly', async () => {
    const updateFormData = vi.fn();
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} updateFormData={updateFormData} formData={{ injuryAreas: ['back'] }} />);

    // Select a new injury
    await user.click(screen.getByText('🦵 Knees'));
    expect(updateFormData).toHaveBeenCalledWith('injuryAreas', ['back', 'knees']);

    // Deselect an existing injury
    await user.click(screen.getByText('🔙 Lower Back'));
    expect(updateFormData).toHaveBeenCalledWith('injuryAreas', []);

    // Select "No Issues"
    await user.click(screen.getByText('✅ No Issues'));
    expect(updateFormData).toHaveBeenCalledWith('injuryAreas', ['none']);
  });

  it('handles medical notes input', async () => {
    const updateFormData = vi.fn();
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} updateFormData={updateFormData} />);

    const textarea = screen.getByPlaceholderText(/recovering from ACL surgery/i);
    await user.type(textarea, 'Asthma');

    expect(updateFormData).toHaveBeenCalledWith('problems', expect.any(String));
  });

  it('handles dietary preference selection', async () => {
    const updateFormData = vi.fn();
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} updateFormData={updateFormData} />);

    await user.click(screen.getByText('Vegan'));
    expect(updateFormData).toHaveBeenCalledWith('dietPreference', 'vegan');
  });

  it('handles diet strictness selection', async () => {
    const updateFormData = vi.fn();
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} updateFormData={updateFormData} />);

    await user.click(screen.getByText('Moderate — I eat mostly clean'));
    expect(updateFormData).toHaveBeenCalledWith('dietControl', 'moderate');
  });

  it('handles sleep hours selection', async () => {
    const updateFormData = vi.fn();
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} updateFormData={updateFormData} />);

    await user.click(screen.getByText('7-8 hours'));
    expect(updateFormData).toHaveBeenCalledWith('sleepHours', '7to8');
  });

  it('calls prevStep when Back is clicked', async () => {
    const prevStep = vi.fn();
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} prevStep={prevStep} />);

    await user.click(screen.getByText('Back'));
    expect(prevStep).toHaveBeenCalled();
  });

  it('calls nextStep when Next is clicked', async () => {
    const nextStep = vi.fn();
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} nextStep={nextStep} />);

    await user.click(screen.getByRole('button', { name: /Next Step/i }));
    expect(nextStep).toHaveBeenCalled();
  });
});
