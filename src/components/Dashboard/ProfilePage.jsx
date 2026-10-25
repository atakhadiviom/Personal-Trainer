import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as googleFit from '../../utils/googleFitService';
import { deleteAccount, exportUserData } from '../../utils/accountData';

const ProfilePage = ({ formData, user, resetWizard }) => {
  const currentUser = user || auth.currentUser;

  const handleSignOut = () => signOut(auth);
  const [dataBusy, setDataBusy] = useState(false);
  const [dataError, setDataError] = useState(null);

  const handleExport = async () => {
    if (!currentUser) return;
    setDataError(null);
    setDataBusy(true);
    try {
      await exportUserData(currentUser);
    } catch (err) {
      setDataError(`Export failed: ${err.message}`);
    } finally {
      setDataBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    if (!window.confirm('Delete your NovaFit account and all your data? This cannot be undone.')) return;
    setDataError(null);
    setDataBusy(true);
    try {
      await deleteAccount(currentUser);
    } catch (err) {
      setDataError(`Delete failed: ${err.message}`);
      setDataBusy(false);
    }
  };
  const [dynamicTDEE, setDynamicTDEE] = useState(null);
  useEffect(() => {
    const fetchTDEE = async () => {
      if (googleFit.getToken()) {
        try {
          const tdee = await googleFit.getWeeklyAverageCalories();
          if (tdee) setDynamicTDEE(tdee);
        } catch (e) { console.warn('TDEE fetch error:', e); }
      }
    };
    fetchTDEE();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="section-card" style={{ borderTop: '4px solid var(--accent-purple)' }}>
        <div className="section-header"><h3 style={{ color: 'var(--accent-purple)' }}>👤 Profile</h3></div>
        
        <div style={{ padding: '32px 24px' }}>
          {/* User Info */}
          <div className="profile-info">
            <div className="profile-avatar">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="avatar" />
              ) : (
                <div className="avatar-placeholder">{(currentUser?.email || 'U')[0].toUpperCase()}</div>
              )}
            </div>
            <div>
              <h3 style={{ marginBottom: '4px' }}>{currentUser?.displayName || 'NovaFit Athlete'}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{currentUser?.email}</p>
            </div>
          </div>

          {/* Current Stats Summary */}
          <div style={{ marginTop: '32px' }}>
            <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Current Profile</h4>
            <div className="profile-stats-grid">
              <div className="profile-stat"><span className="label">Age</span><span className="value">{formData.age || '—'}</span></div>
              <div className="profile-stat"><span className="label">Weight</span><span className="value">{formData.weight ? `${formData.weight} kg` : '—'}</span></div>
              <div className="profile-stat"><span className="label">Height</span><span className="value">{formData.height ? `${formData.height} cm` : '—'}</span></div>
              <div className="profile-stat"><span className="label">Goal</span><span className="value">{formData.goal ? formData.goal.replace('fatloss', 'Fat Loss').replace('muscle', 'Build Muscle').replace('endurance', 'Endurance') : '—'}</span></div>
              <div className="profile-stat"><span className="label">Gym</span><span className="value">{formData.gymName || '—'}</span></div>
              <div className="profile-stat"><span className="label">Location</span><span className="value">{formData.gymLocation || '—'}</span></div>
              <div className="profile-stat"><span className="label">TDEE</span><span className="value">{dynamicTDEE ? `${dynamicTDEE} kcal (Dynamic)` : '—'}</span></div>
            </div>
          </div>

          {/* Visual Progress Chart */}
          {formData.weight && (
            <div style={{ marginTop: '32px' }}>
              <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>12-Week Weight Projection</h4>
              <div style={{ height: '220px', width: '100%', background: 'rgba(0,0,0,0.2)', padding: '16px 8px 8px 0', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={
                      Array.from({length: 12}, (_, i) => ({
                        week: `W${i+1}`,
                        weight: formData.goal === 'fatloss' ? parseInt(formData.weight) - (i * (dynamicTDEE ? 500 * 7 / 7700 : 0.5)) : parseInt(formData.weight) + (i * (dynamicTDEE ? 500 * 7 / 7700 : 0.3))
                      }))
                    }>
                    <XAxis dataKey="week" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={{ background: 'var(--bg-espresso)', border: '1px solid var(--border)', borderRadius: '4px' }} />
                    <Line type="monotone" dataKey="weight" stroke="var(--accent-purple)" strokeWidth={3} dot={{ fill: 'var(--accent-purple)', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="btn-primary" style={{ width: '100%' }} onClick={resetWizard}>
              ↻ Recalibrate — Regenerate My Plan
            </button>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={handleExport} disabled={dataBusy || !currentUser}>
              Export my data (JSON)
            </button>
            <button className="btn-secondary" style={{ width: '100%', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }} onClick={handleSignOut}>
              Sign Out
            </button>
            <button className="btn-secondary" style={{ width: '100%', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }} onClick={handleDelete} disabled={dataBusy || !currentUser}>
              {dataBusy ? 'Working…' : 'Delete my account and data'}
            </button>
            {dataError && <p role="alert" style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>{dataError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
