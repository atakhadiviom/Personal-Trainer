import React from 'react';
import { generateYouTubeSearchUrl } from '../../utils/url';

const ResultPlan = ({ formData, aiPlan, resetApp }) => {
  if (!aiPlan) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '0 0 40px 0' }}>
      
      {/* HEADER OVERVIEW */}
      <div className="result-header">
        <h2 className="super-title gradient-text">{aiPlan.overview.title}</h2>
        <p className="subtitle-tech">{aiPlan.overview.subtitle}</p>
        {aiPlan.overview.specialNote && (
          <div className="alert-box alert-warning">
            <span className="icon">⚠️</span> {aiPlan.overview.specialNote}
          </div>
        )}
      </div>

      {/* 12-WEEK PROGRESSION TIMELINE */}
      <div className="section-card section-progression">
        <div className="section-header">
            <h3>📈 12-Week Progression Strategy</h3>
        </div>
        <div className="timeline">
            {aiPlan.progression.map((item, i) => (
                <div key={i} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                        <h4>{item.phase}</h4>
                        <p>{item.focus}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* NUTRITION & MEAL PLAN */}
      <div className="section-card section-nutrition">
        <div className="section-header">
            <h3>🥗 Daily Nutrition & Meal Plan</h3>
        </div>
        <div className="macro-grid">
            <div className="macro-stat">
                <span className="macro-label">Target Calories</span>
                <span className="macro-val cal">{aiPlan.nutrition.macros.calories}</span>
            </div>
            <div className="macro-stat">
                <span className="macro-label">Protein</span>
                <span className="macro-val pro">{aiPlan.nutrition.macros.protein}</span>
            </div>
            <div className="macro-stat">
                <span className="macro-label">Carbs</span>
                <span className="macro-val car">{aiPlan.nutrition.macros.carbs}</span>
            </div>
            <div className="macro-stat">
                <span className="macro-label">Fat</span>
                <span className="macro-val fat">{aiPlan.nutrition.macros.fat}</span>
            </div>
        </div>
        <div className="meal-plan-table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Meal</th>
                        <th>Recommendation</th>
                    </tr>
                </thead>
                <tbody>
                    {aiPlan.nutrition.mealPlan.map((m, i) => (
                        <tr key={i}>
                            <td className="fw-bold">{m.meal}</td>
                            <td>{m.food}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* WORKOUT SCHEDULE (4 DAYS) */}
      <div className="section-card section-workout">
        <div className="section-header">
            <h3>🛹 Weekly Workout Schedule (4 Days)</h3>
        </div>
        
        <div className="workout-days">
            {aiPlan.workout.schedule.map((day, idx) => (
                <div key={idx} className="day-card">
                    <h4 className="day-title">{day.label}</h4>
                    
                    {/* WARMUP */}
                    <div className="phase warmup-phase">
                        <h5>Warm-Up</h5>
                        <ul>
                            {day.warmup.map((w, i) => (
                                <li key={i}><strong>{w.name}</strong> • {w.duration}</li>
                            ))}
                        </ul>
                    </div>

                    {/* MAIN EXERCISES */}
                    <div className="table-responsive">
                        <table className="data-table exercise-table">
                            <thead>
                                <tr>
                                    <th>Exercise</th>
                                    <th>Sets & Reps</th>
                                    <th>Rest</th>
                                    <th>Weight/Intensity</th>
                                    <th>Guide</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {day.exercises.map((ex, i) => (
                                    <tr key={i}>
                                        <td className="ex-name">{ex.name}</td>
                                        <td className="ex-sets"><strong>{ex.sets}</strong> sets × <strong>{ex.reps}</strong></td>
                                        <td className="ex-rest">{ex.rest}</td>
                                        <td className="ex-weight">{ex.weight}</td>
                                        <td className="ex-guide"><small>{ex.guide}</small></td>
                                        <td className="ex-action">
                                            <a 
                                              href={generateYouTubeSearchUrl(ex.name)}
                                              target="_blank" 
                                              rel="noreferrer"
                                              className="btn-yt"
                                            >
                                              ▶ Watch
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* COOLDOWN */}
                    <div className="phase cooldown-phase">
                        <h5>Cool-Down</h5>
                        <ul>
                            {day.cooldown.map((c, i) => (
                                <li key={i}><strong>{c.name}</strong> • {c.duration}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* MINDSET & RULES */}
      <div className="section-card section-mindset">
        <div className="section-header">
            <h3>🧠 Mindset & Lifestyle Rules</h3>
        </div>
        <ul className="mindset-list">
            {aiPlan.mindset.map((rule, idx) => (
                <li key={idx}>✓ {rule}</li>
            ))}
        </ul>
      </div>

      <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={resetApp} style={{ padding: '16px 40px', fontSize: '1.2rem' }}>
          ↻ Recalibrate Profile
        </button>
      </div>
    </div>
  );
};

export default ResultPlan;
