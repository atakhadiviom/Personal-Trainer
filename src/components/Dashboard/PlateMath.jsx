import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../Layout/Icon';
import {
  BAR_OPTIONS,
  computePlateLoad,
  describePlateLoad,
  formatBarKg,
  getBarWeight,
  isBarbellLift,
  onBarWeightChange,
  plateLoadAdvice,
  plateLoadLabel,
  setBarWeight
} from '../../utils/plateMath';

// The sleeve, drawn: a plate's height tracks its weight so 25 kg reads at a glance.
const plateHeight = (kg) => Math.min(46, 12 + kg * 1.3);

// Tells the athlete which plates go on each side of the bar for the load in the box.
// Renders nothing for bodyweight, cable, dumbbell or machine work — there is no bar
// to load, and a wrong instruction mid-set is worse than no instruction.
const PlateMath = ({ exerciseName, weightKg }) => {
  const [barKg, setBarKgState] = useState(() => getBarWeight());

  useEffect(() => onBarWeightChange(setBarKgState), []);

  const load = useMemo(
    () => (isBarbellLift(exerciseName) ? computePlateLoad(weightKg, { barKg }) : null),
    [exerciseName, weightKg, barKg]
  );

  if (!load) return null;

  const handleBar = (event) => setBarKgState(setBarWeight(event.target.value));

  return (
    <div className="ws-plates" data-testid="ws-plates" role="group" aria-label="Plates to load on the bar">
      <div className="ws-plates-head">
        <Icon name="dumbbell" />
        <strong>Load the bar</strong>
        <label className="ws-plates-bar-wrap">
          <span className="ws-plates-bar-label">bar</span>
          <select
            className="ws-plates-bar"
            value={String(barKg)}
            onChange={handleBar}
            aria-label="Bar weight"
            data-testid="ws-plates-bar"
          >
            {BAR_OPTIONS.map(option => (
              <option key={option.id} value={String(option.kg)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ws-plates-body">
        <div className="ws-plates-rack" aria-hidden="true">
          {load.barKg > 0 && <span className="ws-plate is-bar" style={{ height: '10px' }} />}
          {load.perSide.map(plate => (
            Array.from({ length: plate.count }).map((_, i) => (
              <span
                key={`${plate.kg}-${i}`}
                className="ws-plate"
                data-kg={plate.kg}
                style={{ height: `${plateHeight(plate.kg)}px` }}
              >
                {plate.kg}
              </span>
            ))
          ))}
          {load.perSide.length === 0 && <span className="ws-plates-empty">empty bar</span>}
        </div>

        <div className="ws-plates-info">
          <span className="ws-plates-total" data-testid="ws-plates-total">
            {formatBarKg(load.buildableKg)}
          </span>
          <span className="ws-plates-side">{describePlateLoad(load) || 'no plates yet'}</span>
        </div>
      </div>

      <p className={`ws-plates-advice ${load.exact ? '' : 'is-warn'}`} data-testid="ws-plates-advice">
        {plateLoadAdvice(load)}
      </p>
      <span className="sr-only">{plateLoadLabel(load)}</span>
    </div>
  );
};

export default PlateMath;
export { PlateMath };
