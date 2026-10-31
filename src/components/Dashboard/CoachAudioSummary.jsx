import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '../Layout/Icon';
import {
  isSpeechSupported,
  speakCoachText,
  stopCoachSpeech,
  generateCoachScript
} from '../../utils/coachVoice';

const CoachAudioSummary = ({
  isOpen = true,
  onClose,
  week = 1,
  nextWeek = 2,
  checkinData = null,
  customScript = '',
  coachName = 'Coach Leo',
  autoPlay = false,
  onProceed
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [copied, setCopied] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const speechCtrlRef = useRef(null);

  const scriptText = customScript || generateCoachScript({
    week,
    weekRating: checkinData?.weekRating,
    energyLevel: checkinData?.energyLevel,
    currentWeight: checkinData?.currentWeight,
    previousWeight: checkinData?.previousWeight,
    newPain: checkinData?.newPain,
    notes: checkinData?.notes,
    coachName
  });

  const supported = isSpeechSupported();

  const handleStop = useCallback(() => {
    if (speechCtrlRef.current) {
      speechCtrlRef.current.stop();
      speechCtrlRef.current = null;
    }
    stopCoachSpeech();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const handlePlay = useCallback((rate = playbackRate) => {
    if (!supported) return;

    if (isPaused && speechCtrlRef.current) {
      speechCtrlRef.current.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    handleStop();
    setHasFinished(false);

    speechCtrlRef.current = speakCoachText(scriptText, {
      rate,
      onStart: () => {
        setIsSpeaking(true);
        setIsPaused(false);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setHasFinished(true);
      },
      onError: () => {
        setIsSpeaking(false);
        setIsPaused(false);
      },
      onPause: () => {
        setIsPaused(true);
        setIsSpeaking(false);
      },
      onResume: () => {
        setIsPaused(false);
        setIsSpeaking(true);
      }
    });
  }, [supported, isPaused, handleStop, scriptText, playbackRate]);

  const handlePause = useCallback(() => {
    if (speechCtrlRef.current) {
      speechCtrlRef.current.pause();
    }
    setIsPaused(true);
    setIsSpeaking(false);
  }, []);

  const handleReplay = useCallback(() => {
    handleStop();
    setTimeout(() => {
      handlePlay(playbackRate);
    }, 50);
  }, [handleStop, handlePlay, playbackRate]);

  const handleRateChange = (newRate) => {
    setPlaybackRate(newRate);
    if (isSpeaking) {
      handleStop();
      setTimeout(() => {
        handlePlay(newRate);
      }, 50);
    }
  };

  const handleCopyTranscript = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(scriptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (_e) { void _e;
      // Fallback
    }
  };

  const handleClose = useCallback(() => {
    handleStop();
    onClose?.();
  }, [handleStop, onClose]);

  const handleProceed = () => {
    handleStop();
    onProceed?.();
    onClose?.();
  };

  useEffect(() => {
    if (isOpen && autoPlay && supported) {
      const timer = setTimeout(() => {
        handlePlay(playbackRate);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPlay, supported, handlePlay, playbackRate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      handleStop();
    };
  }, [isOpen, handleClose, handleStop]);

  if (!isOpen) return null;

  return (
    <div
      className="coach-audio-backdrop"
      onClick={handleClose}
      data-testid="coach-audio-backdrop"
      role="presentation"
    >
      <div
        className="coach-audio-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`AI Coach Spoken Check-in Summary for Week ${week}`}
        data-testid="coach-audio-card"
      >
        <button
          type="button"
          className="coach-audio-close"
          onClick={handleClose}
          aria-label="Close audio debrief"
        >
          ×
        </button>

        {/* Coach Header / Persona */}
        <div className="coach-audio-header">
          <div className="coach-badge-row">
            <span className="coach-tag">
              <Icon name="sparkles" /> AI COACH DEBRIEF
            </span>
            <span className="coach-week-tag">Week {week} Review</span>
          </div>

          <div className="coach-avatar-section">
            <div className={`coach-avatar-ring ${isSpeaking ? 'active-pulse' : ''}`}>
              <div className="coach-avatar-inner">
                <Icon name="mic" className="coach-mic-icon" />
              </div>
            </div>

            {/* Sound Wave Equalizer animation */}
            <div className="coach-equalizer" aria-hidden="true">
              {[1, 2, 3, 4, 5].map(bar => (
                <span
                  key={bar}
                  className={`equalizer-bar bar-${bar} ${isSpeaking ? 'animating' : ''}`}
                />
              ))}
            </div>

            <h3 className="coach-name-title">{coachName}</h3>
            <p className="coach-subtitle">
              {isSpeaking
                ? `Speaking your Week ${week} debrief...`
                : isPaused
                ? 'Audio paused'
                : hasFinished
                ? 'Debrief completed 🎉'
                : `Spoken summary for your Week ${nextWeek} transition`}
            </p>
          </div>
        </div>

        {/* Browser support warning if speech synthesis is disabled/missing */}
        {!supported && (
          <div className="coach-unsupported-note" role="alert">
            <Icon name="alert" />
            <span>Audio synthesis is not enabled in this browser. You can read the full transcript below!</span>
          </div>
        )}

        {/* Main Audio Controls */}
        <div className="coach-controls-row">
          <button
            type="button"
            className={`btn-coach-play ${isSpeaking ? 'btn-pause-mode' : ''}`}
            onClick={isSpeaking ? handlePause : () => handlePlay()}
            disabled={!supported}
            aria-label={isSpeaking ? 'Pause audio debrief' : isPaused ? 'Resume audio debrief' : 'Play audio debrief'}
          >
            <Icon name={isSpeaking ? 'pause' : 'play'} />
            <span>{isSpeaking ? 'Pause' : isPaused ? 'Resume' : 'Listen Now'}</span>
          </button>

          <button
            type="button"
            className="btn-coach-sub"
            onClick={handleReplay}
            disabled={!supported}
            aria-label="Replay audio from start"
            title="Replay from start"
          >
            <Icon name="rotate" />
            <span>Replay</span>
          </button>

          <button
            type="button"
            className="btn-coach-sub"
            onClick={handleStop}
            disabled={!supported || (!isSpeaking && !isPaused)}
            aria-label="Stop audio"
            title="Stop audio"
          >
            <Icon name="stop" />
            <span>Stop</span>
          </button>
        </div>

        {/* Speed Selector Chips */}
        {supported && (
          <div className="coach-speed-chips" aria-label="Speech speed selection">
            <span className="speed-label">Speed:</span>
            {[0.9, 1.0, 1.25].map(rate => (
              <button
                key={rate}
                type="button"
                className={`chip-speed ${playbackRate === rate ? 'chip-active' : ''}`}
                onClick={() => handleRateChange(rate)}
                aria-pressed={playbackRate === rate}
              >
                {rate}x
              </button>
            ))}
          </div>
        )}

        {/* Spoken Transcript Bubble */}
        <div className="coach-transcript-box">
          <div className="transcript-header-row">
            <span className="transcript-title">
              <Icon name="brain" /> Spoken Transcript
            </span>
            <button
              type="button"
              className="btn-copy-transcript"
              onClick={handleCopyTranscript}
              aria-label="Copy transcript text"
            >
              <Icon name="copy" /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div
            className={`transcript-content ${showFullTranscript ? 'expanded' : ''}`}
            data-testid="coach-transcript-text"
          >
            <p>"{scriptText}"</p>
          </div>
          {scriptText.length > 220 && (
            <button
              type="button"
              className="btn-transcript-expand"
              onClick={() => setShowFullTranscript(!showFullTranscript)}
            >
              {showFullTranscript ? 'Show less' : 'Read full text'}
            </button>
          )}
        </div>

        {/* Footer Next Action */}
        <div className="coach-audio-footer">
          <button
            type="button"
            className="btn-coach-proceed"
            onClick={handleProceed}
          >
            <span>Start Week {nextWeek} Workout</span>
            <Icon name="arrowRight" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachAudioSummary;
