import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepProblems from '../StepProblems';

describe('StepProblems', () => {
  const defaultProps = {
    formData: {
      injuryAreas: [],
      problems: '',
      dietPreference: '',
      dietControl: '',
      sleepHours: ''
    },
    updateFormData: vi.fn(),
    prevStep: vi.fn(),
    nextStep: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<StepProblems {...defaultProps} />);
    expect(screen.getByText('Health, Diet & Lifestyle')).toBeInTheDocument();
    expect(screen.getByText('Problem Areas (tap all that apply)')).toBeInTheDocument();
    expect(screen.getByText('Additional Medical Notes (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Dietary Preference')).toBeInTheDocument();
    expect(screen.getByText('How strict are you with diet?')).toBeInTheDocument();
    expect(screen.getByText('Average Sleep Per Night')).toBeInTheDocument();
  });

  it('toggles injury areas correctly', async () => {
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} />);

    // Select an injury
    await user.click(screen.getByText('🔙 Lower Back'));
    expect(defaultProps.updateFormData).toHaveBeenCalledWith('injuryAreas', ['back']);
  });

  it('handles "none" injury selection', async () => {
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} formData={{ ...defaultProps.formData, injuryAreas: ['back'] }} />);

    await user.click(screen.getByText('✅ No Issues'));
    expect(defaultProps.updateFormData).toHaveBeenCalledWith('injuryAreas', ['none']);
  });

  it('removes an existing injury selection', async () => {
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} formData={{ ...defaultProps.formData, injuryAreas: ['back', 'knees'] }} />);

    await user.click(screen.getByText('🔙 Lower Back'));
    expect(defaultProps.updateFormData).toHaveBeenCalledWith('injuryAreas', ['knees']);
  });

  it('updates additional medical notes', async () => {
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('e.g., recovering from ACL surgery, asthma, high blood pressure...');
    await user.type(textarea, 'Asthma');

    // We expect it to be called for each character typed, so we can check the last call or any call with 'A'
    expect(defaultProps.updateFormData).toHaveBeenCalledWith('problems', 'A');
  });

  it('selects a dietary preference', async () => {
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} />);

    await user.click(screen.getByText('Vegetarian'));
    expect(defaultProps.updateFormData).toHaveBeenCalledWith('dietPreference', 'vegetarian');
  });

  it('selects diet control level', async () => {
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} />);

    await user.click(screen.getByText('Moderate — I eat mostly clean'));
    expect(defaultProps.updateFormData).toHaveBeenCalledWith('dietControl', 'moderate');
  });

  it('selects sleep options', async () => {
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} />);

    await user.click(screen.getByText('7-8 hours'));
    expect(defaultProps.updateFormData).toHaveBeenCalledWith('sleepHours', '7to8');
  });

  it('calls prevStep when Back is clicked', async () => {
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} />);

    await user.click(screen.getByText('Back'));
    expect(defaultProps.prevStep).toHaveBeenCalled();
  });

  it('calls nextStep when form is submitted', async () => {
    const user = userEvent.setup();
    render(<StepProblems {...defaultProps} />);

    await user.click(screen.getByText('Next Step'));
    expect(defaultProps.nextStep).toHaveBeenCalled();
  });
});
