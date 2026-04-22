import { createPortal } from 'react-dom';

const CheckinModal = ({
  show,
  onClose,
  selectedWeek,
  checkinData,
  setCheckinData,
  generateNextWeek,
  isGenerating
}) => {
  if (!show) return null;

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="section-card" style={{ width: '100%', maxWidth: '480px', borderRadius: 'var(--r-lg)', padding: '32px 24px', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 }}>×</button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
          <h2 style={{ margin: 0 }}>Week {selectedWeek} Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Tell me how it went so I can personalize Week {selectedWeek + 1} for you.</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Current Weight (kg)</label>
          <input type="number" className="input-field" value={checkinData.currentWeight} onChange={e => setCheckinData({ ...checkinData, currentWeight: e.target.value })} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>How did this week feel?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              { id: 'too_easy', label: 'Too Easy', emoji: '😴' },
              { id: 'perfect', label: 'Perfect', emoji: '💪' },
              { id: 'too_hard', label: 'Too Hard', emoji: '🥵' }
            ].map(opt => (
              <button key={opt.id} onClick={() => setCheckinData({ ...checkinData, weekRating: opt.id })} style={{ padding: '14px 8px', borderRadius: 'var(--r-md)', border: `2px solid ${checkinData.weekRating === opt.id ? 'var(--accent-cyan)' : 'var(--border)'}`, background: checkinData.weekRating === opt.id ? 'rgba(0,229,255,0.1)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center', color: 'var(--text-primary)' }}>
                <div style={{ fontSize: '1.4rem' }}>{opt.emoji}</div>
                <div style={{ fontSize: '0.72rem', marginTop: '4px', color: 'var(--text-secondary)' }}>{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Energy level this week</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setCheckinData({ ...checkinData, energyLevel: n })} style={{ flex: 1, height: '44px', borderRadius: 'var(--r-md)', border: 'none', background: checkinData.energyLevel >= n ? 'var(--accent-cyan)' : 'var(--bg-card)', color: checkinData.energyLevel >= n ? '#000' : 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>{n}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>New pain or injuries? <span style={{ color: 'var(--text-dim)' }}>(optional)</span></label>
          <textarea className="input-field" rows="2" placeholder="e.g. Left shoulder twinge on bench press..." value={checkinData.newPain} onChange={e => setCheckinData({ ...checkinData, newPain: e.target.value })} style={{ resize: 'none' }} />
        </div>

        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Anything else? <span style={{ color: 'var(--text-dim)' }}>(optional)</span></label>
          <textarea className="input-field" rows="2" placeholder="Sleep quality, diet, motivation..." value={checkinData.notes} onChange={e => setCheckinData({ ...checkinData, notes: e.target.value })} style={{ resize: 'none' }} />
        </div>

        <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1rem' }} onClick={generateNextWeek} disabled={isGenerating}>
          {isGenerating ? `⏳ Generating Week ${selectedWeek + 1}...` : `Generate Week ${selectedWeek + 1} 🚀`}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default CheckinModal;
