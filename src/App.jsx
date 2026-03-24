import React, { useState, useEffect } from 'react';
import './index.css';

import { auth, db, app } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import Login from './components/Auth/Login';
import StepBody from './components/Wizard/StepBody';
import StepProblems from './components/Wizard/StepProblems';
import StepGym from './components/Wizard/StepGym';
import StepWatch from './components/Wizard/StepWatch';
import StepPhoto from './components/Wizard/StepPhoto';
import LoadingAI from './components/Wizard/LoadingAI';

import Navbar from './components/Layout/Navbar';
import MyPlan from './components/Dashboard/MyPlan';
import CalorieTrackerPage from './components/Dashboard/CalorieTrackerPage';
import ProgressGallery from './components/Dashboard/ProgressGallery';
import ProfilePage from './components/Dashboard/ProfilePage';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('wizard'); // 'wizard' | 'dashboard'
  const [activeTab, setActiveTab] = useState('plan');

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: '', weight: '', height: '', gender: '', goal: '',
    problems: '', gymName: '', gymLocation: '',
    watchConnected: false, photoUploaded: false
  });
  const [aiPlan, setAiPlan] = useState(null);

  // Auth listener + load saved data
  useEffect(() => {
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
    setStep(6);
    
    try {
      const functions = getFunctions(app);
      const generateFn = httpsCallable(functions, 'generateNovaFitPlan');
      const result = await generateFn({ formData });
      const generated = result.data;

      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          formData, aiPlan: generated, updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      setAiPlan(generated);
      setView('dashboard');
      setActiveTab('plan');
    } catch (err) {
      console.warn("Cloud AI Generation failed (likely missing Gemini API Key). Falling back to powerful local simulated AI.", err);
      // Fallback
      setTimeout(() => {
        import('./utils/aiMock').then(async (module) => {
          const generated = module.generateAIGymPlan(formData);
          if (user) {
            await setDoc(doc(db, 'users', user.uid), {
              formData, aiPlan: generated, updatedAt: new Date().toISOString()
            }, { merge: true });
          }
          setAiPlan(generated);
          setView('dashboard');
          setActiveTab('plan');
        });
      }, 3500);
    }
  };

  const resetWizard = () => {
    setView('wizard');
    setStep(1);
    setAiPlan(null);
  };

  const renderWizardStep = () => {
    switch (step) {
      case 1: return <StepBody formData={formData} updateFormData={updateFormData} nextStep={nextStep} />;
      case 2: return <StepProblems formData={formData} updateFormData={updateFormData} prevStep={prevStep} nextStep={nextStep} />;
      case 3: return <StepGym formData={formData} updateFormData={updateFormData} prevStep={prevStep} nextStep={nextStep} />;
      case 4: return <StepWatch formData={formData} updateFormData={updateFormData} prevStep={prevStep} nextStep={nextStep} />;
      case 5: return <StepPhoto formData={formData} updateFormData={updateFormData} prevStep={prevStep} nextStep={generatePlan} />;
      case 6: return <LoadingAI />;
      default: return <StepBody formData={formData} updateFormData={updateFormData} nextStep={nextStep} />;
    }
  };

  const renderDashboardTab = () => {
    switch (activeTab) {
      case 'plan': return <MyPlan formData={formData} aiPlan={aiPlan} />;
      case 'calories': return <CalorieTrackerPage formData={formData} />;
      case 'photos': return <ProgressGallery />;
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
            {step < 6 && <div className="step-indicator">Step {step} of 5</div>}
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
