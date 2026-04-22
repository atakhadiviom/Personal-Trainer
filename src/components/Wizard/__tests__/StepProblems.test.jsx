import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepProblems from '../StepProblems';

describe('StepProblems', () => {
  const mockUpdateFormData = vi.fn();
  const mockNextStep = vi.fn();
  const mockPrevStep = vi.fn();

  const defaultFormData = {
    injuryAreas: [],
    problems: '',
    dietPreference: 'no_restriction',
    dietControl: 'moderate',
    sleepHours: '7to8',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form elements with default values', () => {
    render(
      <StepProblems
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    expect(screen.getByText('Health, Diet & Lifestyle')).toBeInTheDocument();
    expect(screen.getByText('🔙 Lower Back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., recovering from ACL surgery, asthma, high blood pressure...')).toBeInTheDocument();
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByText('Moderate — I eat mostly clean')).toBeInTheDocument();
    expect(screen.getByText('7-8 hours')).toBeInTheDocument();
  });

  it('calls updateFormData when a problem area is toggled', async () => {
    const user = userEvent.setup();
    render(
      <StepProblems
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const backInjury = screen.getByText('🔙 Lower Back');
    await user.click(backInjury);

    expect(mockUpdateFormData).toHaveBeenCalledWith('injuryAreas', ['back']);
  });

  it('calls updateFormData to "none" and clears other injuries when "No Issues" is selected', async () => {
    const user = userEvent.setup();
    render(
      <StepProblems
        formData={{ ...defaultFormData, injuryAreas: ['back', 'knees'] }}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const noIssues = screen.getByText('✅ No Issues');
    await user.click(noIssues);

    expect(mockUpdateFormData).toHaveBeenCalledWith('injuryAreas', ['none']);
  });

  it('removes an injury from the list when toggled off', async () => {
    const user = userEvent.setup();
    render(
      <StepProblems
        formData={{ ...defaultFormData, injuryAreas: ['back', 'knees'] }}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const backInjury = screen.getByText('🔙 Lower Back');
    await user.click(backInjury);

    expect(mockUpdateFormData).toHaveBeenCalledWith('injuryAreas', ['knees']);
  });

  it('clears "none" when another injury is selected', async () => {
    const user = userEvent.setup();
    render(
      <StepProblems
        formData={{ ...defaultFormData, injuryAreas: ['none'] }}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const backInjury = screen.getByText('🔙 Lower Back');
    await user.click(backInjury);

    expect(mockUpdateFormData).toHaveBeenCalledWith('injuryAreas', ['back']);
  });

  it('calls updateFormData when additional medical notes are entered', async () => {
    const user = userEvent.setup();
    render(
      <StepProblems
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const textarea = screen.getByPlaceholderText('e.g., recovering from ACL surgery, asthma, high blood pressure...');
    await user.type(textarea, 'Asthma');

    // It calls updateFormData on every keystroke, so we just check it was called at least once with the correct field
    expect(mockUpdateFormData).toHaveBeenCalledWith('problems', expect.any(String));
  });

  it('calls updateFormData when a dietary preference is selected', async () => {
    const user = userEvent.setup();
    render(
      <StepProblems
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const veganOption = screen.getByText('Vegan');
    await user.click(veganOption);

    expect(mockUpdateFormData).toHaveBeenCalledWith('dietPreference', 'vegan');
  });

  it('calls updateFormData when a diet control level is selected', async () => {
    const user = userEvent.setup();
    render(
      <StepProblems
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const strictOption = screen.getByText('Strict — I follow macros precisely');
    await user.click(strictOption);

    expect(mockUpdateFormData).toHaveBeenCalledWith('dietControl', 'strict');
  });

  it('calls updateFormData when a sleep option is selected', async () => {
    const user = userEvent.setup();
    render(
      <StepProblems
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const less5Option = screen.getByText('< 5 hours');
    await user.click(less5Option);

    expect(mockUpdateFormData).toHaveBeenCalledWith('sleepHours', 'less5');
  });

  it('calls nextStep when the form is submitted', async () => {
    const user = userEvent.setup();
    render(
      <StepProblems
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const nextButton = screen.getByRole('button', { name: /next step/i });
    await user.click(nextButton);

    expect(mockNextStep).toHaveBeenCalledTimes(1);
  });

  it('calls prevStep when the back button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <StepProblems
        formData={defaultFormData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);

    expect(mockPrevStep).toHaveBeenCalledTimes(1);
  });

  it('applies the active class to the selected options based on formData', () => {
    const formData = {
      injuryAreas: ['knees'],
      problems: '',
      dietPreference: 'keto',
      dietControl: 'strict',
      sleepHours: 'more8',
    };

    render(
      <StepProblems
        formData={formData}
        updateFormData={mockUpdateFormData}
        prevStep={mockPrevStep}
        nextStep={mockNextStep}
      />
    );

    const kneesCard = screen.getByText('🦵 Knees').closest('.selection-card');
    const ketoCard = screen.getByText('Keto / Low Carb').closest('.selection-card');
    const strictCard = screen.getByText('Strict — I follow macros precisely').closest('.selection-card');
    const more8Card = screen.getByText('8+ hours').closest('.selection-card');

    expect(kneesCard).toHaveClass('active');
    expect(ketoCard).toHaveClass('active');
    expect(strictCard).toHaveClass('active');
    expect(more8Card).toHaveClass('active');

    const backCard = screen.getByText('🔙 Lower Back').closest('.selection-card');
    expect(backCard).not.toHaveClass('active');
  });
});
