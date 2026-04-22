import ExerciseRow from './ExerciseRow';

const WeeklySchedule = ({
  schedule,
  localPlan,
  selectedWeek,
  completedExercises,
  swapping,
  toggleExercise,
  handleSwap
}) => {
  if (!schedule) {
    return (
      <div className="section-card" style={{ textAlign: 'center', padding: '48px 24px', marginTop: '20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
        <h3>Week {selectedWeek} Locked</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
          Complete Week {selectedWeek - 1} and submit your check-in to unlock your personalized Week {selectedWeek} workouts.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Phase Label */}
      <div style={{ margin: '20px 0 24px 0' }}>
        {localPlan.progression?.map((p, i) => {
          const isActive = (selectedWeek <= 4 && i === 0) || (selectedWeek >= 5 && selectedWeek <= 8 && i === 1) || (selectedWeek >= 9 && i === 2);
          return isActive ? (
            <div key={i} className="alert-box" style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', width: '100%' }}>
              <strong>{p.phase}:</strong> {p.focus}
            </div>
          ) : null;
        })}
      </div>

      {/* Daily Schedule */}
      {schedule.map((day, dayIdx) => (
        <div key={dayIdx} className="section-card" style={{ borderTop: '4px solid var(--accent-cyan)', marginBottom: '24px' }}>
          <div className="section-header">
            <h3 style={{ color: 'var(--accent-cyan)' }}>{day.label}</h3>
          </div>

          <div className="phase warmup-phase">
            <h5>Warm-Up</h5>
            <ul>
              {day.warmup.map((w, i) => (
                <li key={i}>
                  <strong>{w.name}</strong> • {w.duration}
                  <a href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(w.name)}`} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', color: 'var(--accent-cyan)', fontSize: '0.75rem', textDecoration: 'none' }}>▶ Watch</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="table-responsive">
            <table className="data-table exercise-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>✓</th>
                  <th>Exercise</th>
                  <th>Sets × Reps</th>
                  <th>Rest</th>
                  <th>Weight</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {day.exercises.map((ex, exIdx) => {
                  const key = `w${selectedWeek}_${day.id}_${exIdx}`;
                  const oldKey = selectedWeek === 1 ? `${day.id}_${exIdx}` : null;
                  const isDone = !!(completedExercises[key] || (oldKey && completedExercises[oldKey]));
                  return (
                    <ExerciseRow
                      key={exIdx}
                      ex={ex}
                      exIdx={exIdx}
                      dayIdx={dayIdx}
                      dayId={day.id}
                      isDone={isDone}
                      isSwapping={swapping === `${dayIdx}_${exIdx}`}
                      toggleExercise={toggleExercise}
                      handleSwap={handleSwap}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="phase cooldown-phase">
            <h5>Cool-Down</h5>
            <ul>
              {day.cooldown.map((c, i) => (
                <li key={i}>
                  <strong>{c.name}</strong> • {c.duration}
                  <a href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(c.name)}`} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', color: 'var(--accent-cyan)', fontSize: '0.75rem', textDecoration: 'none' }}>▶ Watch</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </>
  );
};

export default WeeklySchedule;
