import React, { useState, useEffect } from 'react';
import './index.css';

import { auth, db, aiInstance } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getGenerativeModel } from 'firebase/ai';

import Login from './components/Auth/Login';
import StepBody from './components/Wizard/StepBody';
import StepProblems from './components/Wizard/StepProblems';
import StepGym from './components/Wizard/StepGym';
import StepWatch from './components/Wizard/StepWatch';
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
    setStep(5);
    try {
      const model = getGenerativeModel(aiInstance, { 
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const prompt = `You are an elite Gym Trainer. Generate a structured 12-week gym payload for a ${formData.age}yo ${formData.gender}, ${formData.weight}kg, ${formData.height}cm. Goal: ${formData.goal}. Limitations: ${formData.problems}. Gym: ${formData.gymName}. 
      Return EXACTLY this JSON format and nothing else. No markdown or backticks.
      {
        "overview": { "title": "string", "subtitle": "string", "specialNote": "string" },
        "nutrition": { "macros": { "calories": 2000, "protein": "180g", "carbs": "180g", "fat": "70g" }, "mealPlan": [{"meal": "string", "food": "string"}] },
        "progression": [ { "phase": "string", "focus": "string"} ],
        "workout": { 
           "schedule": [ { "id": "day1", "label": "string", "warmup": [ { "name": "string", "duration": "string"} ], "exercises": [ { "name": "string", "sets": 3, "reps": "8-12", "rest": "90s", "weight": "string", "guide": "string" } ], "cooldown": [{"name": "string", "duration": "string"}] } ]
        },
        "mindset": ["Rule 1", "Rule 2"]
      }`;

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      // Safely trim markdown if returned
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const generated = JSON.parse(text);

      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          formData, aiPlan: generated, updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      setAiPlan(generated);
      setView('dashboard');
      setActiveTab('plan');
    } catch (err) {
      console.error("Firebase AI Logic failed. Ensure Vertex AI is enabled via Firebase Console.", err);
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
      }, 2000);
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
      case 4: return <StepWatch formData={formData} updateFormData={updateFormData} prevStep={prevStep} nextStep={generatePlan} />;
      case 5: return <LoadingAI />;
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
            {step < 5 && <div className="step-indicator">Step {step} of 4</div>}
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
