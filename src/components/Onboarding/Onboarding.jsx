import React, { useState } from 'react';

const slides = [
  {
    icon: '🏆',
    title: 'Your AI Personal Trainer',
    body: 'NovaFit builds a fully personalized 12-week gym plan around your body, goals, and schedule — powered by Gemini AI.',
  },
  {
    icon: '📋',
    title: 'A Plan That Adapts To You',
    body: 'Complete each week and check in. The AI adjusts weights, volume, and exercises based on how your body responds.',
  },
  {
    icon: '❤️',
    title: 'Connected to Your Health',
    body: 'Sync with Google Fit to track steps, heart rate, calories burned, and sleep — all in one place.',
  },
  {
    icon: '🚀',
    title: "Let's Build Your Body",
    body: 'Takes 3 minutes to set up. Your personalized plan will be ready instantly.',
  },
];

const Onboarding = ({ onFinish }) => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goNext = () => {
    if (animating) return;
    if (current === slides.length - 1) { onFinish(); return; }
    setAnimating(true);
    setTimeout(() => {
      setCurrent(c => c + 1);
      setAnimating(false);
    }, 280);
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--bg-espresso)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '48px 24px 40px',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
    }}>

      {/* Top row: dots + skip */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              height: '8px',
              width: i === current ? '24px' : '8px',
              borderRadius: '4px',
              background: i === current
                ? 'linear-gradient(135deg, #e8a838, #d4654a)'
                : 'rgba(255,240,210,0.15)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
          ))}
        </div>

        {/* Skip */}
        {!isLast && (
          <button onClick={onFinish} style={{
            background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '0.85rem',
            cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
            padding: '4px 0',
          }}>
            Skip
          </button>
        )}
      </div>

      {/* Slide content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', maxWidth: '320px', width: '100%',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(-16px)' : 'translateY(0)',
        transition: 'opacity 0.28s ease, transform 0.28s ease',
      }}>
        {/* Icon with glow */}
        <div style={{ position: 'relative', marginBottom: '32px' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '120px', height: '120px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,168,56,0.2) 0%, transparent 70%)',
          }} />
          <div style={{ fontSize: '5rem', lineHeight: 1, position: 'relative' }}>{slide.icon}</div>
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '1.9rem', lineHeight: 1.15,
          letterSpacing: '-0.02em', marginBottom: '16px',
          background: 'linear-gradient(135deg, #e8a838 0%, #d4654a 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {slide.title}
        </h1>

        {/* Body */}
        <p style={{
          color: 'var(--text-muted)', fontSize: '1rem',
          lineHeight: 1.65, margin: 0,
        }}>
          {slide.body}
        </p>
      </div>

      {/* Bottom: Next / Get Started */}
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <button
          className="btn-primary"
          onClick={goNext}
          style={{ width: '100%', padding: '16px', fontSize: '1rem' }}
        >
          {isLast ? 'Get Started 🚀' : 'Next →'}
        </button>

        {/* Slide counter */}
        <p style={{
          textAlign: 'center', marginTop: '16px',
          color: 'var(--text-dim)', fontSize: '0.78rem',
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {current + 1} / {slides.length}
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
