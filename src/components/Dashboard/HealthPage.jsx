import React, { useState, useEffect } from 'react';
import * as googleFit from '../../utils/googleFitService';

const MetricCard = ({ label, value, unit, color }) => (
  <div className="section-card" style={{ borderLeft: `4px solid ${color}` }}>
    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
      {value !== null ? (typeof value === 'number' ? value.toLocaleString() : value) : '--'}
    </div>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>{unit}</div>
  </div>
);

const HealthPage = () => {
  const [isConnected, setIsConnected] = useState(!!googleFit.getToken());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({ steps: null, calories: null, heartRate: null, sleep: null });
  const [sleepHistory, setSleepHistory] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [steps, calories, heartRate, sleep, sleepHist] = await Promise.all([
        googleFit.getSteps(),
        googleFit.getCaloriesBurned(),
        googleFit.getHeartRate(),
        googleFit.getSleep(),
        googleFit.getSleepHistory()
      ]);
      setMetrics({ steps, calories, heartRate, sleep });
      if (sleepHist?.length) setSleepHistory(sleepHist);
    } catch (err) {
      if (err.message === 'Token expired') {
        setIsConnected(false);
      } else {
        setError('Failed to fetch health data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    googleFit.initTokenClient();
    if (isConnected) fetchData();
  }, [isConnected]);

  const handleConnect = () => {
    googleFit.connect()
      .then(() => setIsConnected(true))
      .catch(() => setError('Connection failed. Make sure to allow all permissions.'));
  };

  const handleDisconnect = () => {
    googleFit.disconnect();
    setIsConnected(false);
    setMetrics({ steps: null, calories: null, heartRate: null, sleep: null });
  };

  if (!isConnected) {
    return (
      <div className="animate-fade-in">
        <div className="section-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❤️</div>
          <h3 style={{ marginBottom: '12px' }}>Connect Google Fit</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.6' }}>
            Sync your steps, calories, heart rate, and sleep automatically.
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '28px', lineHeight: '1.5' }}>
            💡 Make sure "Health Connect" sync is enabled in your Google Fit app so your CMF Watch 2 data flows through.
          </p>
          {error && (
            <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</p>
          )}
          <button className="btn-primary" onClick={handleConnect} style={{ width: '100%' }}>
            Connect Google Fit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 className="gradient-text" style={{ margin: 0 }}>Today's Health</h3>
        <button
          className="btn-secondary"
          onClick={handleDisconnect}
          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
        >
          Disconnect
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', border: '1px solid rgba(255,107,107,0.4)', color: '#ff6b6b', borderRadius: 'var(--r-md)', background: 'rgba(255,107,107,0.08)', fontSize: '0.9rem' }}>
          {error}&nbsp;
          <button onClick={fetchData} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent-orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <MetricCard label="Steps" value={metrics.steps} unit="today" color="var(--accent-orange)" />
            <MetricCard label="Calories" value={metrics.calories} unit="kcal burned" color="var(--accent-purple)" />
            <MetricCard label="Heart Rate" value={metrics.heartRate != null ? `${metrics.heartRate} BPM` : null} unit="avg today" color="#ff6b6b" />
            <MetricCard label="Sleep" value={metrics.sleep != null ? `${metrics.sleep} hrs` : null} unit="last night" color="var(--accent-blue)" />
          </div>

          <button
            className="btn-secondary"
            onClick={fetchData}
            style={{ width: '100%', marginTop: '8px', fontSize: '0.9rem' }}
          >
            ↻ Refresh
          </button>

          {/* Feature 8: Recovery Trend */}
          {sleepHistory.length > 0 && (() => {
            const avg = sleepHistory.reduce((s, d) => s + d.hours, 0) / sleepHistory.length;
            const insight = avg >= 7 ? 'Great recovery week — push hard' : avg >= 5.5 ? 'Moderate recovery — stay consistent' : 'Poor sleep trend — reduce intensity';
            const insightColor = avg >= 7 ? 'var(--accent-green)' : avg >= 5.5 ? '#e8a838' : '#ff6b6b';
            return (
              <div className="section-card" style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>Recovery Trend</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', marginBottom: '8px' }}>
                  {sleepHistory.map((d, i) => {
                    const barColor = d.hours >= 7 ? 'var(--accent-green)' : d.hours >= 5.5 ? '#e8a838' : '#ff6b6b';
                    const heightPct = Math.min(Math.round((d.hours / 10) * 100), 100);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ width: '100%', background: barColor, borderRadius: '3px 3px 0 0', height: `${heightPct}%`, opacity: 0.85 }} />
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{d.date?.slice(5)}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.82rem', color: insightColor, fontWeight: 600 }}>{insight}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Avg {avg.toFixed(1)} hrs / night</div>
              </div>
            );
          })()}

          {/* Feature 12: Chronotype Scheduling */}
          {sleepHistory.length > 0 && (() => {
            const avg = sleepHistory.reduce((s, d) => s + d.hours, 0) / sleepHistory.length;
            const { label, time } = avg >= 8
              ? { label: 'Night Owl', time: '5–7 PM' }
              : avg >= 7
              ? { label: 'Flexible', time: 'Any time' }
              : { label: 'Early Bird', time: '7–9 AM' };
            return (
              <div className="section-card" style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', fontFamily: "'IBM Plex Mono', monospace" }}>Optimal Training Time</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '2rem' }}>⏰</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{time}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>{label} · based on your sleep pattern</div>
                  </div>
                </div>
              </div>
            );
          })()}

          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.72rem', marginTop: '16px' }}>
            Data from Google Fit · CMF Watch 2 → Nothing X → Health Connect → Google Fit
          </p>
        </>
      )}
    </div>
  );
};

export default HealthPage;
