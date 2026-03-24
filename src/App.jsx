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
    setStep(4);
    try {
      const model = getGenerativeModel(aiInstance, { 
        model: "gemini-2.5-flash-lite",
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const injuryList = (formData.injuryAreas || []).filter(i => i !== 'none').join(', ');
      const prompt = `You are an elite, certified personal trainer creating a hyper-personalized 12-week fitness program.

CLIENT PROFILE:
- Age: ${formData.age}, Gender: ${formData.gender}
- Current Weight: ${formData.weight}kg, Height: ${formData.height}cm
- Target Weight: ${formData.targetWeight || 'not specified'}kg
- Estimated Body Fat: ${formData.bodyFat || 'unknown'}%
- Gym Experience Level: ${formData.fitnessLevel || 'beginner'}
- Primary Goal: ${formData.goal}
- Exact Goal Description: ${formData.exactGoal || 'Not specified'}

HEALTH & DIET:
- Problem Areas / Injuries: ${injuryList || 'None'}
- Additional Medical Notes: ${formData.problems || 'None'}
- Dietary Preference: ${formData.dietPreference || 'no restriction'}
- Diet Discipline Level: ${formData.dietControl || 'moderate'} (strict = follows macros precisely, moderate = eats mostly clean, low = struggles with diet)

LIFESTYLE:
- Average Sleep: ${formData.sleepHours || '7-8 hours'}

TRAINING SETUP:
- Environment: ${formData.trainingEnv || 'full gym'}
- Gym: ${formData.gymName}, Location: ${formData.gymLocation || 'N/A'}
- Weekly Schedule: ${formData.daysPerWeek || '4'} days per week
- Session Duration: ${formData.sessionLength || '60'} minutes per session

CRITICAL INSTRUCTIONS:
1. Create EXACTLY ${formData.daysPerWeek || '4'} training days per week.
2. Each session MUST fit within ${formData.sessionLength || '60'} minutes.
3. Scale exercise difficulty to ${formData.fitnessLevel || 'beginner'} level with specific starting weights in kg.
4. AVOID all exercises that stress: ${injuryList || 'none'} — provide safe alternatives.
5. Nutrition must respect their ${formData.dietPreference || 'no restriction'} diet.
6. Adjust calorie targets based on diet discipline: if "low", keep the meal plan simple and realistic; if "strict", include precise macro breakdowns.
7. If sleep is under 6 hours, reduce training volume and emphasize recovery.
8. The user's specific goal is: "${formData.exactGoal || formData.goal}". Tailor everything to achieve this.
9. Include 3 progression phases across the 12 weeks.

Return EXACTLY this JSON format. No markdown, no backticks, pure JSON only:
{
  "overview": { "title": "string", "subtitle": "string", "specialNote": "string" },
  "nutrition": { "macros": { "calories": 2000, "protein": "180g", "carbs": "180g", "fat": "70g" }, "mealPlan": [{"meal": "Breakfast", "food": "detailed meal description"}] },
  "progression": [ { "phase": "Weeks 1-4", "focus": "description"} ],
  "workout": {
    "schedule": [ { "id": "day1", "label": "Upper Body Push", "warmup": [ { "name": "string", "duration": "string"} ], "exercises": [ { "name": "string", "sets": 3, "reps": "8-12", "rest": "90s", "weight": "Start: 20kg", "guide": "Form cue description" } ], "cooldown": [{"name": "string", "duration": "string"}] } ]
  },
  "mindset": ["Tip 1", "Tip 2", "Tip 3"]
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
