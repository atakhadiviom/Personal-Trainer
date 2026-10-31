import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CoachAudioSummary from '../components/Dashboard/CoachAudioSummary';

describe('CoachAudioSummary component', () => {
  let originalSpeechSynthesis;
  let originalUtterance;
  let mockSpeak;
  let mockCancel;
  let mockPause;
  let mockResume;

  beforeEach(() => {
    mockSpeak = vi.fn();
    mockCancel = vi.fn();
    mockPause = vi.fn();
    mockResume = vi.fn();

    originalSpeechSynthesis = window.speechSynthesis;
    originalUtterance = window.SpeechSynthesisUtterance;

    window.speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      pause: mockPause,
      resume: mockResume,
      getVoices: vi.fn(() => [{ name: 'Google US English', lang: 'en-US' }]),
      speaking: false,
      paused: false
    };

    window.SpeechSynthesisUtterance = vi.fn(function (text) {
      this.text = text;
      this.rate = 1.0;
      this.pitch = 1.0;
      this.volume = 1.0;
      this.voice = null;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve())
      }
    });
  });

  afterEach(() => {
    window.speechSynthesis = originalSpeechSynthesis;
    window.SpeechSynthesisUtterance = originalUtterance;
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CoachAudioSummary isOpen={false} onClose={vi.fn()} week={1} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders coach name, week number, and transcript when open', () => {
    render(
      <CoachAudioSummary
        isOpen={true}
        onClose={vi.fn()}
        week={1}
        nextWeek={2}
        coachName="Coach Leo"
        checkinData={{
          weekRating: 'perfect',
          energyLevel: 4,
          currentWeight: 76
        }}
      />
    );

    expect(screen.getByText('Coach Leo')).toBeTruthy();
    expect(screen.getByText('Week 1 Review')).toBeTruthy();
    expect(screen.getByTestId('coach-transcript-text')).toBeTruthy();
    expect(screen.getByRole('button', { name: /play audio debrief/i })).toBeTruthy();
  });

  it('triggers speech synthesis when clicking Listen Now / Play', async () => {
    render(
      <CoachAudioSummary
        isOpen={true}
        onClose={vi.fn()}
        week={2}
        nextWeek={3}
        customScript="Great job on Week 2 champion!"
      />
    );

    const playBtn = screen.getByRole('button', { name: /play audio debrief/i });
    await act(async () => {
      fireEvent.click(playBtn);
    });

    expect(mockSpeak).toHaveBeenCalled();
    const createdUtterance = mockSpeak.mock.calls[0][0];
    expect(createdUtterance.text).toBe('Great job on Week 2 champion!');
  });

  it('copies script to clipboard when clicking Copy', async () => {
    render(
      <CoachAudioSummary
        isOpen={true}
        onClose={vi.fn()}
        week={1}
        customScript="Keep up the great work!"
      />
    );

    const copyBtn = screen.getByRole('button', { name: /copy transcript text/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Keep up the great work!');
  });

  it('adjusts playback rate when clicking speed chips', async () => {
    render(
      <CoachAudioSummary
        isOpen={true}
        onClose={vi.fn()}
        week={1}
        customScript="Checking speed setting"
      />
    );

    const speedChip125 = screen.getByRole('button', { name: '1.25x' });
    await act(async () => {
      fireEvent.click(speedChip125);
    });

    expect(speedChip125.getAttribute('aria-pressed')).toBe('true');

    const playBtn = screen.getByRole('button', { name: /play audio debrief/i });
    await act(async () => {
      fireEvent.click(playBtn);
    });

    const createdUtterance = mockSpeak.mock.calls[0][0];
    expect(createdUtterance.rate).toBe(1.25);
  });

  it('closes modal and calls onProceed when clicking start next week button', async () => {
    const handleProceed = vi.fn();
    const handleClose = vi.fn();

    render(
      <CoachAudioSummary
        isOpen={true}
        onClose={handleClose}
        onProceed={handleProceed}
        week={1}
        nextWeek={2}
      />
    );

    const proceedBtn = screen.getByRole('button', { name: /start week 2 workout/i });
    await act(async () => {
      fireEvent.click(proceedBtn);
    });

    expect(handleProceed).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalled();
  });

  it('closes on Escape key press', async () => {
    const handleClose = vi.fn();

    render(
      <CoachAudioSummary
        isOpen={true}
        onClose={handleClose}
        week={1}
      />
    );

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(handleClose).toHaveBeenCalled();
  });
});
