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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [steps, calories, heartRate, sleep] = await Promise.all([
        googleFit.getSteps(),
        googleFit.getCaloriesBurned(),
        googleFit.getHeartRate(),
        googleFit.getSleep()
      ]);
      setMetrics({ steps, calories, heartRate, sleep });
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

          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.72rem', marginTop: '16px' }}>
            Data from Google Fit · CMF Watch 2 → Nothing X → Health Connect → Google Fit
          </p>
        </>
      )}
    </div>
  );
};

export default HealthPage;
