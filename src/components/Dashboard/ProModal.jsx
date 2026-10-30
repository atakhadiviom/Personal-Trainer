import React, { useState, useEffect } from 'react';
import Icon from '../Layout/Icon';
import {
  PRO_FEATURES,
  PRO_PRICE_MONTHLY,
  PRO_PRICE_ANNUAL,
  isProSubscriber,
  getSubscriptionDetails,
  upgradeToPro,
  cancelProSubscription,
  onSubscriptionChange
} from '../../utils/subscription';

const ProModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [cycle, setCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(getSubscriptionDetails);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const unsub = onSubscriptionChange(() => {
      setSubscription(getSubscriptionDetails());
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsub();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentIsPro = subscription?.isPro || isProSubscriber();

  const handleUpgrade = async () => {
    setLoading(true);
    // Simulate payment / checkout processing
    setTimeout(() => {
      const details = upgradeToPro(cycle);
      setSubscription(details);
      setLoading(false);
      onSuccess?.(`Welcome to NovaFit Pro! All elite coaching features unlocked 🔥`);
      onClose();
    }, 450);
  };

  const handleCancel = () => {
    cancelProSubscription();
    setSubscription(getSubscriptionDetails());
    onSuccess?.('NovaFit Pro subscription cancelled. You have returned to the Free tier.');
    onClose();
  };

  const priceDisplay = cycle === 'annual' ? `$${PRO_PRICE_ANNUAL} / year` : `$${PRO_PRICE_MONTHLY} / month`;
  const periodText = cycle === 'annual' ? 'Billed annually ($6.67/mo, save 33%)' : 'Billed monthly, cancel anytime';

  return (
    <div
      className="share-modal-backdrop"
      onClick={onClose}
      data-testid="pro-modal-backdrop"
      role="presentation"
    >
      <div
        className="pro-modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="NovaFit Pro Upgrade"
        data-testid="pro-modal-card"
      >
        <button
          type="button"
          className="share-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>

        {/* Header */}
        <div className="pro-modal-header">
          <div className="pro-pill-badge">
            <Icon name="sparkles" />
            <span>NOVAFIT PRO ATHLETE</span>
          </div>
          <h2 className="pro-modal-title">
            Unlock Your <span className="gradient-text">Full Potential</span>
          </h2>
          <p className="pro-modal-subtitle">
            Advanced AI-driven training adaptations, real-time biometric sleep readiness, and precision nutrition.
          </p>
        </div>

        {/* If already active Pro */}
        {currentIsPro ? (
          <div className="pro-active-card" data-testid="pro-active-banner">
            <div className="pro-active-icon">👑</div>
            <div className="pro-active-info">
              <h4>NovaFit Pro is Active</h4>
              <p>You have unrestricted access to all elite coaching algorithms.</p>
              <span className="pro-renewal-pill">Renews: {subscription.renewsAt || 'Next month'} ({subscription.cycle})</span>
            </div>
            <div className="pro-active-actions">
              <button
                type="button"
                className="btn-secondary"
                style={{ color: 'var(--terracotta)', borderColor: 'rgba(255,107,107,0.3)', width: '100%' }}
                onClick={handleCancel}
                data-testid="btn-cancel-pro"
              >
                Downgrade to Free Plan
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Billing cycle selector */}
            <div className="pro-cycle-switcher" role="radiogroup" aria-label="Billing cycle">
              <button
                type="button"
                role="radio"
                aria-checked={cycle === 'monthly'}
                className={`cycle-btn ${cycle === 'monthly' ? 'active' : ''}`}
                onClick={() => setCycle('monthly')}
                data-testid="cycle-monthly-btn"
              >
                Monthly ($9.99/mo)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={cycle === 'annual'}
                className={`cycle-btn ${cycle === 'annual' ? 'active' : ''}`}
                onClick={() => setCycle('annual')}
                data-testid="cycle-annual-btn"
              >
                Annual ($79.99/yr)
                <span className="save-badge">Save 33%</span>
              </button>
            </div>

            {/* Price Box */}
            <div className="pro-price-box">
              <div className="price-main">{priceDisplay}</div>
              <div className="price-sub">{periodText}</div>
            </div>
          </>
        )}

        {/* Features Matrix */}
        <div className="pro-features-grid">
          {PRO_FEATURES.map((feat) => (
            <div className="pro-feature-item" key={feat.id}>
              <div className="feat-icon-col">
                <span className="feat-icon-bubble">
                  <Icon name={feat.icon} />
                </span>
              </div>
              <div className="feat-text-col">
                <div className="feat-title-row">
                  <strong>{feat.title}</strong>
                  <span className="feat-chip">{feat.badge}</span>
                </div>
                <p className="feat-desc">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Guarantee & CTA Footer (if not currently Pro) */}
        {!currentIsPro && (
          <div className="pro-modal-footer">
            <div className="pro-guarantee-note">
              <Icon name="checkCircle" /> 14-day money-back guarantee • 1-tap instant cancel anytime
            </div>
            <button
              type="button"
              className="btn-pro-upgrade"
              onClick={handleUpgrade}
              disabled={loading}
              data-testid="btn-confirm-upgrade"
            >
              {loading ? (
                <>
                  <Icon name="loader" className="spin" /> Activating NovaFit Pro...
                </>
              ) : (
                <>
                  <Icon name="sparkles" /> Upgrade to NovaFit Pro ({priceDisplay})
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProModal;
