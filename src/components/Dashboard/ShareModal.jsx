import React from 'react';
import Icon from '../Layout/Icon';

const ShareModal = ({
  isOpen,
  onClose,
  week = 1,
  totalWeeks = 12,
  completedCount = 0,
  onCopySuccess
}) => {
  if (!isOpen) return null;

  const appUrl = 'https://novafitai.tech';
  const shareText = `🔥 Milestone unlocked! I just finished Week ${week} of my 12-Week AI Transformation on NovaFit AI.\n\n💪 Consistency: 100% on track\n🎯 Goal: Custom AI gym plan\n\nBuild your free personalized plan here: ${appUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      onCopySuccess?.('Transformation card copied to clipboard! 🔥');
    } catch {
      // Fallback
    }
  };

  const handleWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `NovaFit AI — Week ${week} Transformation`,
          text: shareText,
          url: appUrl
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopy();
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
  const progressPercent = Math.min(100, Math.round((week / totalWeeks) * 100));

  return (
    <div
      className="share-modal-backdrop"
      onClick={onClose}
      data-testid="share-modal-backdrop"
      role="presentation"
    >
      <div
        className="share-modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Week ${week} Transformation Card`}
        data-testid="share-modal-card"
      >
        <button
          type="button"
          className="share-modal-close"
          onClick={onClose}
          aria-label="Close share modal"
        >
          ×
        </button>

        {/* Visual Transformation Card */}
        <div className="transformation-preview-card" data-testid="transformation-preview">
          <div className="preview-top-badge">
            <Icon name="sparkles" />
            <span>NOVAFIT AI COACH</span>
          </div>

          <div className="preview-title">
            WEEK {week} CRUSHED
          </div>

          <div className="preview-subtitle">
            12-Week Transformation Program
          </div>

          <div className="preview-progress-track">
            <div
              className="preview-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="preview-progress-meta">
            <span>Progress</span>
            <strong>{progressPercent}% Complete</strong>
          </div>

          <div className="preview-stats-row">
            <div className="preview-stat-item">
              <span className="stat-label">Milestone</span>
              <strong className="stat-val">{week}/{totalWeeks} Wks</strong>
            </div>
            <div className="preview-stat-item">
              <span className="stat-label">Workouts</span>
              <strong className="stat-val">{completedCount > 0 ? `${completedCount} logged` : '100% done'}</strong>
            </div>
            <div className="preview-stat-item">
              <span className="stat-label">Status</span>
              <strong className="stat-val highlight">On Track 🔥</strong>
            </div>
          </div>

          <div className="preview-footer-brand">
            <span>Powered by <strong>novafitai.tech</strong></span>
          </div>
        </div>

        {/* Share CTAs */}
        <div className="share-actions-container">
          <button
            type="button"
            className="btn-share-whatsapp"
            onClick={handleWhatsApp}
            aria-label="Share on WhatsApp"
          >
            <Icon name="send" /> Share on WhatsApp
          </button>

          {hasNativeShare ? (
            <button
              type="button"
              className="btn-share-native"
              onClick={handleNativeShare}
              aria-label="Share via system share sheet"
            >
              <Icon name="share" /> More Share Options
            </button>
          ) : (
            <button
              type="button"
              className="btn-share-native"
              onClick={handleCopy}
              aria-label="Copy transformation card text"
            >
              <Icon name="share" /> Copy Progress Card
            </button>
          )}

          <button
            type="button"
            className="btn-share-copy"
            onClick={handleCopy}
            aria-label="Copy text and link"
          >
            Copy Text & Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
