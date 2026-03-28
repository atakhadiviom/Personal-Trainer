import React, { useState, useEffect } from 'react';
import './index.css';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { generateWorkoutPlan } from './utils/aiService';

import Login from './components/Auth/Login';
import StepBody from './components/Wizard/StepBody';
import StepProblems from './components/Wizard/StepProblems';
import StepGym from './components/Wizard/StepGym';
import LoadingAI from './components/Wizard/LoadingAI';

import Navbar from './components/Layout/Navbar';
import MyPlan from './components/Dashboard/MyPlan';
import CalorieTrackerPage from './components/Dashboard/CalorieTrackerPage';
import ProfilePage from './components/Dashboard/ProfilePage';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('wizard'); // 'wizard' | 'dashboard'
  const [activeTab, setActiveTab] = useState('plan');

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: '', weight: '', height: '', gender: '', goal: '',
    exactGoal: '', targetWeight: '', bodyFat: '', fitnessLevel: '',
    problems: '', injuryAreas: [], dietPreference: '',
    dietControl: '', sleepHours: '',
    gymName: '', gymLocation: '', trainingEnv: '',
    daysPerWeek: '', sessionLength: '',
    watchConnected: false
  });
  const [aiPlan, setAiPlan] = useState(null);
  const [aiError, setAiError] = useState(null);

  // Auth listener + load saved data
  useEffect(() => {
    // Must await getRedirectResult FIRST so Firebase processes the OAuth redirect
    // before onAuthStateChanged fires — otherwise it fires with null and shows login
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.aiPlan) {
              setAiPlan(data.aiPlan);
              if (data.formData) setFormData(data.formData);
              setView('dashboard');
            }
          }
        } catch (e) {
          console.error("Error fetching user data:", e);
        }
      } else {
        setView('wizard');
        setAiPlan(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const updateFormData = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const generatePlan = async () => {
    setStep(4);
    setAiError(null);
    try {
      const generated = await generateWorkoutPlan(formData);

      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          formData, aiPlan: generated, updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      setAiPlan(generated);
      setView('dashboard');
      setActiveTab('plan');
    } catch (err) {
      console.error("Firebase AI Logic failed:", err);
      setStep(0); // reset to show error
      setAiError(err.message || "AI generation failed. Please try again.");
    }
  };

  const resetWizard = () => {
    setView('wizard');
    setStep(1);
    setAiPlan(null);
  };

  const renderWizardStep = () => {
    if (step === 0 && aiError) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h2 className="step-title" style={{ color: '#ff6b6b' }}>AI Generation Failed</h2>
          <p className="step-subtitle" style={{ marginBottom: '8px' }}>{aiError}</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '24px' }}>This usually means the Vertex AI quota was exceeded or the service is temporarily unavailable.</p>
          <div className="btn-group" style={{ justifyContent: 'center', gap: '12px' }}>
            <button className="btn-primary" onClick={generatePlan}>🔄 Retry Generation</button>
            <button className="btn-secondary" onClick={() => { setStep(3); setAiError(null); }}>← Back to Wizard</button>
          </div>
        </div>
      );
    }
    switch (step) {
      case 1: return <StepBody formData={formData} updateFormData={updateFormData} nextStep={nextStep} />;
      case 2: return <StepProblems formData={formData} updateFormData={updateFormData} prevStep={prevStep} nextStep={nextStep} />;
      case 3: return <StepGym formData={formData} updateFormData={updateFormData} prevStep={prevStep} nextStep={generatePlan} />;
      case 4: return <LoadingAI />;
      default: return <StepBody formData={formData} updateFormData={updateFormData} nextStep={nextStep} />;
    }
  };

  const renderDashboardTab = () => {
    switch (activeTab) {
      case 'plan': return <MyPlan formData={formData} aiPlan={aiPlan} />;
      case 'calories': return <CalorieTrackerPage formData={formData} />;
      case 'profile': return <ProfilePage formData={formData} resetWizard={resetWizard} />;
      default: return <MyPlan formData={formData} aiPlan={aiPlan} />;
    }
  };

  // --- LOADING ---
  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="gradient-text" style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Initializing...</div>
      </div>
    );
  }

  // --- LOGIN ---
  if (!user) return <Login />;

  // --- WIZARD ---
  if (view === 'wizard') {
    return (
      <div className="container">
        <header className="header animate-fade-in">
          <a href="/" className="logo"><span className="gradient-text">NovaFit</span> AI</a>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {step < 4 && <div className="step-indicator">Step {step} of 3</div>}
            <button onClick={() => signOut(auth)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Sign Out</button>
          </div>
        </header>
        <main className="main-content">
          <div className="glass wizard-card animate-fade-in" key={step}>
            {renderWizardStep()}
          </div>
        </main>
      </div>
    );
  }

  // --- DASHBOARD ---
  return (
    <div className="app-shell">
      <header className="dash-header">
        <a href="/" className="logo"><span className="gradient-text">NovaFit</span> AI</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.displayName || user.email}</span>
        </div>
      </header>
      <main className="dash-content">
        {renderDashboardTab()}
      </main>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;
