import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../Layout/Icon';
import { parseRestSeconds, formatTimer } from '../../utils/timer';

const playBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio autoplay restrictions or unsupported
  }
};

const RestTimer = ({
  initialSeconds = 60,
  exerciseName = '',
  onClose,
  onFinish
}) => {
  const initialParsed = parseRestSeconds(initialSeconds);
  const [totalDuration, setTotalDuration] = useState(initialParsed);
  const [timeLeft, setTimeLeft] = useState(initialParsed);
  const [isRunning, setIsRunning] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [prevInitial, setPrevInitial] = useState(initialSeconds);

  // Sync state if initialSeconds prop changes during render
  if (prevInitial !== initialSeconds) {
    setPrevInitial(initialSeconds);
    const parsed = parseRestSeconds(initialSeconds);
    setTotalDuration(parsed);
    setTimeLeft(parsed);
    setIsRunning(true);
    setIsCompleted(false);
  }

  const handleFinish = useCallback(() => {
    setIsRunning(false);
    setIsCompleted(true);
    playBeep();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // Ignore vibration permission errors
      }
    }
    onFinish?.();
  }, [onFinish]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft, handleFinish]);

  const adjustTime = (delta) => {
    setTimeLeft(prev => {
      const next = Math.max(0, prev + delta);
      if (next > totalDuration) {
        setTotalDuration(next);
      }
      if (next === 0) {
        handleFinish();
      } else if (isCompleted) {
        setIsCompleted(false);
        setIsRunning(true);
      }
      return next;
    });
  };

  const resetTimer = () => {
    setTimeLeft(totalDuration);
    setIsRunning(true);
    setIsCompleted(false);
  };

  const toggleRunning = () => {
    if (isCompleted) {
      resetTimer();
    } else {
      setIsRunning(prev => !prev);
    }
  };

  const timeFormatted = formatTimer(timeLeft);
  const progressPercent = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 100;

  return (
    <div
      role="region"
      aria-label="Rest timer"
      className={`rest-timer-dock ${isCompleted ? 'timer-completed' : ''}`}
      data-testid="rest-timer"
    >
      <div
        className="rest-timer-progress-bar"
        style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        aria-hidden="true"
      />

      <div className="rest-timer-inner">
        <div className="rest-timer-info">
          <div className="rest-timer-header">
            <span className="rest-timer-badge">
              <Icon name="timer" className="icon-timer-pulse" />
              {isCompleted ? 'Rest Finished!' : 'Resting'}
            </span>
            {exerciseName && <span className="rest-timer-ex-name">{exerciseName}</span>}
          </div>
          <div
            className="rest-timer-digits"
            role="timer"
            aria-live="polite"
            data-testid="rest-timer-digits"
          >
            {timeFormatted}
          </div>
        </div>

        <div className="rest-timer-controls">
          <button
            type="button"
            className="btn-timer-chip"
            onClick={() => adjustTime(-15)}
            disabled={timeLeft <= 5}
            aria-label="Subtract 15 seconds"
          >
            -15s
          </button>
          <button
            type="button"
            className={`btn-timer-action ${isRunning ? 'btn-pause' : 'btn-play'}`}
            onClick={toggleRunning}
            aria-label={isRunning ? 'Pause rest timer' : 'Resume rest timer'}
          >
            <Icon name={isRunning ? 'pause' : 'play'} />
          </button>
          <button
            type="button"
            className="btn-timer-chip"
            onClick={() => adjustTime(30)}
            aria-label="Add 30 seconds"
          >
            +30s
          </button>
          <button
            type="button"
            className="btn-timer-chip btn-timer-reset"
            onClick={resetTimer}
            aria-label="Reset rest timer"
            title="Reset"
          >
            <Icon name="rotate" />
          </button>
          {onClose && (
            <button
              type="button"
              className="btn-timer-close"
              onClick={onClose}
              aria-label="Close rest timer"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestTimer;
