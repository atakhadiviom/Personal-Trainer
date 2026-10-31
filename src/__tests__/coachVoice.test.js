import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCoachScript,
  isSpeechSupported,
  getEnglishVoices,
  speakCoachText,
  stopCoachSpeech
} from '../utils/coachVoice';

describe('coachVoice utility', () => {
  describe('generateCoachScript', () => {
    it('generates a balanced default coaching script for perfect rating', () => {
      const script = generateCoachScript({
        week: 1,
        weekRating: 'perfect',
        energyLevel: 3,
        currentWeight: 75,
        coachName: 'Coach Leo'
      });

      expect(script).toContain('Hey champion! Coach Leo here with your Week 1 debrief.');
      expect(script).toContain('You rated Week 1 as feeling spot on!');
      expect(script).toContain('Your energy held steady at 3 out of 5.');
      expect(script).toContain('Weigh-in recorded at 75 kilograms.');
      expect(script).toContain("Week 2 is ready and waiting.");
    });

    it('generates high intensity progressive overload guidance for too_easy rating', () => {
      const script = generateCoachScript({
        week: 2,
        weekRating: 'too_easy',
        energyLevel: 5,
        currentWeight: 80,
        previousWeight: 79.2
      });

      expect(script).toContain('You reported that Week 2 felt too easy.');
      expect(script).toContain('stepped up your progressive overload');
      expect(script).toContain('Your energy was high at 5 out of 5');
      expect(script).toContain('+0.8 kilogram shift');
    });

    it('generates recovery and deload cues for too_hard rating and low energy', () => {
      const script = generateCoachScript({
        week: 3,
        weekRating: 'too_hard',
        energyLevel: 2,
        newPain: 'right shoulder impingement',
        notes: 'trouble sleeping'
      });

      expect(script).toContain('You noted that Week 3 was really tough.');
      expect(script).toContain('balanced your accessory volume and dialed in recovery');
      expect(script).toContain('prioritize 8 hours of deep sleep');
      expect(script).toContain('right shoulder impingement');
      expect(script).toContain('trouble sleeping');
    });

    it('handles missing or partial parameters gracefully', () => {
      const script = generateCoachScript();
      expect(script).toContain('Hey champion! Coach Leo here with your Week 1 debrief.');
      expect(script).toContain('Week 2 is ready and waiting.');
    });
  });

  describe('speech synthesis browser integrations', () => {
    let originalSpeechSynthesis;
    let originalUtterance;
    let mockSpeak;
    let mockCancel;
    let mockPause;
    let mockResume;
    let mockGetVoices;

    beforeEach(() => {
      mockSpeak = vi.fn();
      mockCancel = vi.fn();
      mockPause = vi.fn();
      mockResume = vi.fn();
      mockGetVoices = vi.fn(() => [
        { name: 'Google US English', lang: 'en-US' },
        { name: 'Samantha (Enhanced)', lang: 'en-US' },
        { name: 'Thomas', lang: 'fr-FR' }
      ]);

      originalSpeechSynthesis = window.speechSynthesis;
      originalUtterance = window.SpeechSynthesisUtterance;

      window.speechSynthesis = {
        speak: mockSpeak,
        cancel: mockCancel,
        pause: mockPause,
        resume: mockResume,
        getVoices: mockGetVoices,
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
        this.onpause = null;
        this.onresume = null;
      });
    });

    afterEach(() => {
      window.speechSynthesis = originalSpeechSynthesis;
      window.SpeechSynthesisUtterance = originalUtterance;
      vi.clearAllMocks();
    });

    it('correctly detects speech synthesis support', () => {
      expect(isSpeechSupported()).toBe(true);
    });

    it('returns filtered English voices', () => {
      const voices = getEnglishVoices();
      expect(voices).toHaveLength(2);
      expect(voices[0].name).toBe('Google US English');
    });

    it('speaks text and triggers lifecycle callbacks', () => {
      const onStart = vi.fn();
      const onEnd = vi.fn();

      const controller = speakCoachText('Test coaching audio', {
        rate: 1.25,
        onStart,
        onEnd
      });

      expect(mockCancel).toHaveBeenCalled();
      expect(mockSpeak).toHaveBeenCalled();

      const createdUtterance = mockSpeak.mock.calls[0][0];
      expect(createdUtterance.text).toBe('Test coaching audio');
      expect(createdUtterance.rate).toBe(1.25);

      // Trigger utterance events
      createdUtterance.onstart();
      expect(onStart).toHaveBeenCalled();

      createdUtterance.onend();
      expect(onEnd).toHaveBeenCalled();

      // Test controller controls
      controller.stop();
      expect(mockCancel).toHaveBeenCalledTimes(2);
    });

    it('stops speech safely via stopCoachSpeech', () => {
      stopCoachSpeech();
      expect(mockCancel).toHaveBeenCalled();
    });
  });
});
