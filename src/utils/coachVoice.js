// Browser-native Speech Synthesis utility for NovaFit AI Coach Audio Check-ins
let activeUtterance = null;
export const getActiveUtterance = () => activeUtterance;

/**
 * Checks whether the browser runtime supports Web Speech API SpeechSynthesis.
 */
export const isSpeechSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
};

/**
 * Generates an inspiring, personalized spoken coaching script based on weekly check-in data.
 */
export const generateCoachScript = ({
  week = 1,
  weekRating = 'perfect',
  energyLevel = 3,
  currentWeight = null,
  previousWeight = null,
  newPain = '',
  notes = '',
  coachName = 'Coach Leo'
} = {}) => {
  const nextWeek = Number(week) + 1;
  const parts = [];

  parts.push(`Hey champion! ${coachName} here with your Week ${week} debrief.`);

  // Reaction to how the week felt
  if (weekRating === 'too_easy') {
    parts.push(
      `You reported that Week ${week} felt too easy. That is a clear sign your work capacity and neuromuscular efficiency are surging! For Week ${nextWeek}, I have stepped up your progressive overload and dialed in compound strength so your muscles continue adapting.`
    );
  } else if (weekRating === 'too_hard') {
    parts.push(
      `You noted that Week ${week} was really tough. Huge respect for pushing through! For Week ${nextWeek}, I have balanced your accessory volume and dialed in recovery cues so you consolidate your strength without risking burnout.`
    );
  } else {
    parts.push(
      `You rated Week ${week} as feeling spot on! Hitting that sweet spot between training stimulus and recovery means your program is working in peak alignment. For Week ${nextWeek}, we keep building on this momentum.`
    );
  }

  // Energy level context
  const energy = Number(energyLevel);
  if (energy >= 4) {
    parts.push(`Your energy was high at ${energy} out of 5 — keep riding that great momentum!`);
  } else if (energy > 0 && energy <= 2) {
    parts.push(
      `With energy at ${energy} out of 5, make sure you prioritize 8 hours of deep sleep and stay consistent with hydration and pre-workout nutrition.`
    );
  } else if (energy === 3) {
    parts.push(`Your energy held steady at 3 out of 5.`);
  }

  // Weight progression context
  if (currentWeight) {
    const cur = parseFloat(currentWeight);
    if (!isNaN(cur)) {
      if (previousWeight) {
        const prev = parseFloat(previousWeight);
        if (!isNaN(prev) && cur !== prev) {
          const delta = (cur - prev).toFixed(1);
          const sign = cur > prev ? `+${delta}` : `${delta}`;
          parts.push(`Weigh-in recorded at ${cur} kilograms, reflecting a ${sign} kilogram shift tracking with your roadmap.`);
        } else {
          parts.push(`Weigh-in recorded steady at ${cur} kilograms.`);
        }
      } else {
        parts.push(`Weigh-in recorded at ${cur} kilograms.`);
      }
    }
  }

  // Joint/pain alert
  if (newPain && typeof newPain === 'string' && newPain.trim()) {
    parts.push(
      `I took note of your report regarding ${newPain.trim()}. Never train through sharp discomfort; warm up thoroughly and prioritize clean joint mechanics.`
    );
  }

  // Additional user notes
  if (notes && typeof notes === 'string' && notes.trim()) {
    parts.push(`I also reviewed your personal notes: "${notes.trim()}".`);
  }

  parts.push(`Week ${nextWeek} is ready and waiting. Review your exercises, hydrate well, and let's crush it!`);

  return parts.join(' ');
};

/**
 * Get available speech synthesis voices, prioritizing English.
 */
export const getEnglishVoices = () => {
  if (!isSpeechSupported()) return [];
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    return voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  } catch {
    return [];
  }
};

/**
 * Speaks the coach feedback text using window.speechSynthesis.
 */
export const speakCoachText = (text, options = {}) => {
  if (!isSpeechSupported() || !text) {
    options.onError?.(new Error('Speech synthesis not supported or empty text'));
    return {
      pause: () => {},
      resume: () => {},
      stop: () => {}
    };
  }

  const {
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    voice = null,
    onStart,
    onEnd,
    onError,
    onPause,
    onResume
  } = options;

  try {
    // Cancel any previous active speech
    window.speechSynthesis.cancel();

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));
    utterance.pitch = Math.max(0.5, Math.min(1.5, pitch));
    utterance.volume = Math.max(0, Math.min(1.0, volume));

    if (voice) {
      utterance.voice = voice;
    } else {
      // Pick best default natural English voice if available
      const voices = getEnglishVoices();
      const preferred = voices.find(v =>
        /natural|google|samantha|daniel|alex|enhanced/i.test(v.name)
      );
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      activeUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      // Speech cancel emits an 'interrupted' or 'canceled' error event
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        onError?.(e);
      } else {
        onEnd?.();
      }
    };

    utterance.onpause = () => {
      onPause?.();
    };

    utterance.onresume = () => {
      onResume?.();
    };

    // Keep reference in module scope to prevent garbage collection in Chrome
    activeUtterance = utterance;

    window.speechSynthesis.speak(utterance);

    return {
      pause: () => {
        try {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
          }
        } catch (_e) { void _e; }
      },
      resume: () => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch (_e) { void _e; }
      },
      stop: () => {
        try {
          activeUtterance = null;
          window.speechSynthesis.cancel();
          onEnd?.();
        } catch (_e) { void _e; }
      }
    };
  } catch (err) {
    onError?.(err);
    return {
      pause: () => {},
      resume: () => {},
      stop: () => {}
    };
  }
};

/**
 * Safely cancels all ongoing speech synthesis.
 */
export const stopCoachSpeech = () => {
  if (isSpeechSupported()) {
    try {
      activeUtterance = null;
      window.speechSynthesis.cancel();
    } catch (_e) { void _e; }
  }
};
