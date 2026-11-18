// Exercise substitution.
// A gym has one bench, two racks and a queue at 6 pm. This module answers the
// question the plan cannot: what do I do when the kit I need is taken?
//
// It reads the exercise name the AI wrote, works out the movement pattern
// (horizontal push, hinge, vertical pull …) and the kit it needs, then returns
// substitutes from the same pattern that use different kit. Sets, reps and rest
// are the session's business — this file only names the lift and estimates a
// starting load, because a dumbbell and a barbell never carry the same number.
//
// Detection is keyword-based on purpose: plans are free text, so there is no id
// to look up. An unrecognised lift returns no suggestions rather than a guess.
import { DEFAULT_STEP_KG, parseLoadStep, roundToStep } from './loadSteps';

export const MAX_NAME_LENGTH = 80;
export const DEFAULT_SUGGESTION_LIMIT = 3;

// Load factors are relative to a barbell total. They are coaching heuristics, not
// physics: a pair of dumbbells at ~75 % of the bar feels like the same set, a
// selectorised stack reads whatever the manufacturer printed. Every estimate is
// rounded DOWN to the athlete's jump so the first substituted set is never a
// surprise, and every card says it is an estimate.
export const EQUIPMENT = Object.freeze({
  barbell: { id: 'barbell', label: 'Barbell', factor: 1, rank: 7 },
  smith: { id: 'smith', label: 'Smith machine', factor: 1.05, rank: 8 },
  dumbbell: { id: 'dumbbell', label: 'Dumbbells', factor: 0.75, rank: 1 },
  cable: { id: 'cable', label: 'Cable', factor: 0.9, rank: 2 },
  machine: { id: 'machine', label: 'Machine', factor: 1, rank: 3 },
  bodyweight: { id: 'bodyweight', label: 'Bodyweight', factor: 0, rank: 4 },
  band: { id: 'band', label: 'Band', factor: 0, rank: 5 },
  kettlebell: { id: 'kettlebell', label: 'Kettlebell', factor: 0.8, rank: 6 },
  other: { id: 'other', label: 'Other kit', factor: 1, rank: 9 }
});

export const EQUIPMENT_NOTE = Object.freeze({
  dumbbell: 'Dumbbells run ~75 % of the bar, split across both hands.',
  machine: 'Stack numbers vary by machine — match the effort, not the number.',
  smith: 'The fixed path usually lets you handle ~5 % more than a free bar.',
  cable: 'Cable stacks read a little lighter than free weights.',
  kettlebell: 'The bell hangs differently — go one size below the dumbbell you would pick.',
  bodyweight: 'No load to pick: the reps do the work, add one each week.',
  band: 'No weight to log — pick a band and step back until the last rep is honest.',
  barbell: "Same bar maths, rounded to your gym's smallest jump.",
  other: 'Your kit may read differently — start where the first set feels like RPE 7.'
});

// Name fragments that identify the kit. Every phrase is normalised (lowercase,
// single spaces, no hyphens) because the name is normalised the same way first.
// Band is checked before cable so "Banded Lat Pulldown" is not read as a stack.
const EQUIPMENT_WORDS = Object.freeze([
  ['smith', ['smith']],
  ['band', ['band', 'banded', 'loop', 'pull apart']],
  ['cable', ['cable', 'pulldown', 'pull down', 'pushdown', 'push down', 'face pull', 'rope', 'crossover', 'pallof']],
  ['machine', ['machine', 'pec deck', 'leg press', 'hack', 'sled', 'stack', 'assisted', 'preacher', 'ab crunch', 'back extension', 'leg extension', 'seated calf', 'seated leg curl']],
  ['kettlebell', ['kettlebell']],
  ['dumbbell', ['dumbbell', 'dumbbells', 'goblet', 'farmer', 'decline sit up']],
  ['barbell', ['barbell', 'ez bar', 'trap bar', 't bar', 'zercher', 'landmine', 'pendlay', 'upright row', 'skull', 'close grip bench', 'overhead press', 'barbell hold', 'bar']],
  ['bodyweight', ['push up', 'pushup', 'pull up', 'pullup', 'chin up', 'chinup', 'plank', 'air squat',
    'bodyweight', 'sit up', 'dip', 'nordic', 'hanging', 'glute bridge', 'inverted row', 'step up',
    'split squat', 'sissy squat', 'sliding']]
]);

// Movement patterns, most specific first: "leg curl" must beat "curl", and
// "close grip bench" must beat "bench press". Anything not listed is left alone.
const PATTERNS = Object.freeze([
  { id: 'grip', label: 'Grip & carry', words: ['farmer', 'suitcase carry', 'wrist curl', 'dead hang', 'plate pinch', 'barbell hold'] },
  { id: 'shrug', label: 'Shrug', words: ['shrug'] },
  { id: 'calf', label: 'Calf', words: ['calf'] },
  { id: 'hamstring-curl', label: 'Hamstring curl', words: ['leg curl', 'hamstring curl', 'nordic'] },
  { id: 'quad-extension', label: 'Knee extension', words: ['leg extension', 'sissy squat', 'terminal knee'] },
  { id: 'hip-adduction', label: 'Hip adduction', words: ['adduction'] },
  { id: 'hip-abduction', label: 'Hip abduction', words: ['abduction', 'lateral band walk', 'lateral walk', 'monster walk'] },
  { id: 'rear-delt', label: 'Rear delt', words: ['reverse fly', 'reverse flye', 'rear delt', 'face pull', 'reverse pec deck', 'pull apart'] },
  { id: 'chest-fly', label: 'Chest fly', words: ['pec deck', 'chest fly', 'chest flye', 'fly', 'flye', 'crossover'] },
  { id: 'lateral-raise', label: 'Lateral raise', words: ['lateral raise', 'side raise', 'lateral delt', 'upright row'] },
  { id: 'biceps', label: 'Biceps', words: ['curl', 'preacher', 'hammer'] },
  { id: 'triceps', label: 'Triceps', words: ['pushdown', 'push down', 'skull', 'tricep', 'overhead extension', 'dumbbell extension', 'kickback', 'close grip bench', 'dip'] },
  { id: 'core', label: 'Core', words: ['plank', 'crunch', 'sit up', 'leg raise', 'ab wheel', 'pallof', 'dead bug', 'hollow', 'russian twist', 'woodchop', 'side bend', 'mountain climber'] },
  { id: 'lunge', label: 'Single leg', words: ['lunge', 'split squat', 'step up', 'bulgarian'] },
  { id: 'squat', label: 'Squat', words: ['squat', 'leg press', 'hack', 'belt squat', 'pistol'] },
  { id: 'hinge', label: 'Hinge', words: ['deadlift', 'rdl', 'romanian', 'hip thrust', 'good morning', 'glute bridge', 'pull through', 'back extension', 'hyperextension', 'swing', 'hip hinge'] },
  { id: 'vertical-pull', label: 'Vertical pull', words: ['pulldown', 'pull down', 'lat pull', 'pull up', 'pullup', 'chin up', 'chinup'] },
  { id: 'horizontal-pull', label: 'Row', words: ['row'] },
  { id: 'vertical-push', label: 'Overhead press', words: ['overhead press', 'shoulder press', 'military press', 'push press', 'arnold press', 'pike push', 'landmine press', 'z press', 'seated dumbbell press', 'dumbbell shoulder press', 'kettlebell press'] },
  { id: 'horizontal-push', label: 'Horizontal push', words: ['bench press', 'chest press', 'push up', 'pushup', 'floor press', 'svend press', 'incline', 'decline', 'flat press'] }
]);

// Cardio and mobility are not lifts; a "rowing machine" is not a row.
const NOT_A_LIFT = Object.freeze([
  'rowing machine', 'rower', 'erg', 'bike', 'treadmill', 'elliptical', 'stair',
  'jump rope', 'burpee', 'stretch', 'mobility', 'foam roll', 'warm up walk', 'plank jack'
]);

const normalize = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const pad = (text) => ` ${text} `;

export const detectPattern = (name) => {
  const text = normalize(name);
  if (!text) return null;
  const padded = pad(text);
  if (NOT_A_LIFT.some(word => padded.includes(pad(word)) || padded.includes(` ${word}`))) return null;
  const hit = PATTERNS.find(pattern => pattern.words.some(word => padded.includes(pad(word))));
  return hit ? hit.id : null;
};

export const detectEquipment = (name) => {
  const padded = pad(normalize(name));
  if (!padded.trim()) return 'other';
  const hit = EQUIPMENT_WORDS.find(([, words]) => words.some(word => padded.includes(pad(word))));
  return hit ? hit[0] : 'other';
};

export const patternLabel = (patternId) => (
  PATTERNS.find(pattern => pattern.id === patternId)?.label ?? ''
);

export const patternLabelFor = (name) => patternLabel(detectPattern(name));

const entry = (name, pattern, equipment, detail, guide) => ({
  name, pattern, equipment, detail, guide
});

// Every lift the app is willing to suggest. Short `detail` explains why the swap
// works; `guide` replaces the plan's cue for a lift the athlete may not know.
export const SUBSTITUTES = Object.freeze([
  // Horizontal push
  entry('Barbell Bench Press', 'horizontal-push', 'barbell',
    'The classic — needs a rack and, at heavy loads, a spotter.',
    'Lower to mid-chest, tuck the elbows to ~45°, press back over the shoulder joint.'),
  entry('Dumbbell Bench Press', 'horizontal-push', 'dumbbell',
    'Two dumbbells and any flat bench — no rack, no spotter.',
    'Press both bells from chest level; stop just short of lockout to keep tension.'),
  entry('Chest Press Machine', 'horizontal-push', 'machine',
    'Sit down and push — the safest queue-free press.',
    'Set the handles at mid-chest, press until the elbows are almost straight.'),
  entry('Standing Cable Chest Press', 'horizontal-push', 'cable',
    'Standing press that keeps tension through the lockout.',
    'Stagger the stance, press one handle at a time, and resist the way back.'),
  entry('Push-Up', 'horizontal-push', 'bodyweight',
    'No kit at all; elevate the feet to add load.',
    'Hands under the shoulders, ribs down, chest to a fist off the floor.'),
  entry('Smith Machine Bench Press', 'horizontal-push', 'smith',
    'Fixed path — a good call when the bench is free but no spotter is.',
    'Line the bar up with mid-chest and keep the shoulder blades pinned.'),
  entry('Barbell Floor Press', 'horizontal-push', 'barbell',
    'On the floor: the bottom half is shortened, easier on shoulders.',
    'Upper arms touch the floor, pause a beat, then press up.'),

  // Overhead press
  entry('Standing Overhead Press', 'vertical-push', 'barbell',
    'The strength standard — needs a free bar and a rack.',
    'Bar on the front delts, ribs down, press until the bar is over the ears.'),
  entry('Seated Dumbbell Shoulder Press', 'vertical-push', 'dumbbell',
    'Two dumbbells and an upright bench.',
    'Start at ear height, press up and slightly in, elbows under the wrists.'),
  entry('Shoulder Press Machine', 'vertical-push', 'machine',
    'Fixed handles take the balance out of the lift.',
    'Handles at shoulder height, press to just short of lockout.'),
  entry('Single-Arm Cable Shoulder Press', 'vertical-push', 'cable',
    'Half the load, twice the anti-rotation work.',
    'Brace the free arm, press up and slightly across the body.'),
  entry('Pike Push-Up', 'vertical-push', 'bodyweight',
    'Bodyweight overhead pressing with the hips high.',
    'Hips high, head between the hands, lower to a fist off the floor.'),
  entry('Single-Arm Kettlebell Press', 'vertical-push', 'kettlebell',
    'One bell overhead, the core does the stabilising.',
    'Grip the handle loose, press up, keep the wrist straight.'),
  entry('Landmine Press', 'vertical-push', 'barbell',
    'Angled press for shoulders that dislike a straight overhead path.',
    'One end in the landmine, press up and away, ribs down.'),

  // Rows
  entry('Barbell Bent-Over Row', 'horizontal-pull', 'barbell',
    'Heavy, but it takes a bar and a clear floor.',
    'Hinge to ~45°, pull the bar to the belly button, no torso swing.'),
  entry('Single-Arm Dumbbell Row', 'horizontal-pull', 'dumbbell',
    'One dumbbell, one bench, half the queue.',
    'Hand on the bench, pull the bell to the hip, elbow close to the body.'),
  entry('Seated Cable Row', 'horizontal-pull', 'cable',
    'Low impact, constant tension, no setup.',
    'Chest tall, pull the handle to the belly button, squeeze the blades.'),
  entry('Chest-Supported Machine Row', 'horizontal-pull', 'machine',
    'The pad takes the lower back out of the equation.',
    'Chest against the pad, drive the elbows back, pause at the squeeze.'),
  entry('Inverted Row', 'horizontal-pull', 'bodyweight',
    'Under a smith bar or a sturdy table — as hard as you make it.',
    'Body straight, pull the chest to the bar, lower under control.'),
  entry('Banded Seated Row', 'horizontal-pull', 'band',
    'A band around the feet: any floor is a rowing station.',
    'Sit tall, pull both handles to the ribs, resist the return.'),

  // Vertical pull
  entry('Lat Pulldown', 'vertical-pull', 'cable',
    'The default vertical pull — needs the stack.',
    'Chest up, drive the elbows to the ribs, no lean back.'),
  entry('Pull-Up', 'vertical-pull', 'bodyweight',
    'A bar and your bodyweight; add a band to share the load.',
    'Start from a dead hang, pull the chest to the bar, lower slowly.'),
  entry('Assisted Pull-Up Machine', 'vertical-pull', 'machine',
    'The counterweight makes pull-ups available at every strength level.',
    'Kneel on the pad, pull the chest to the handles, lower with control.'),
  entry('Banded Lat Pulldown', 'vertical-pull', 'band',
    'Anchor a band high and pull — no stack, no queue.',
    'Anchor above head height, drive the elbows down and back.'),

  // Squat
  entry('Barbell Back Squat', 'squat', 'barbell',
    'The strength lift — needs a rack and a clear platform.',
    'Bar on the traps, brace, sit between the hips, knees track the toes.'),
  entry('Goblet Squat', 'squat', 'dumbbell',
    'One dumbbell at the chest: no rack, same pattern.',
    'Hold the bell at the sternum, elbows inside the knees at the bottom.'),
  entry('Leg Press', 'squat', 'machine',
    'Seated and supported — the busiest machine, and the easiest to load.',
    'Feet shoulder width, lower until the knees reach ~90°, drive through the mid-foot.'),
  entry('Smith Machine Squat', 'squat', 'smith',
    'Fixed path lets you squat without a spotter.',
    'Bar on the traps, feet slightly forward, sit straight down.'),
  entry('Bodyweight Squat', 'squat', 'bodyweight',
    'A free option when every rack is taken.',
    'Arms forward for balance, sit down between the hips, stand tall.'),
  entry('Kettlebell Front Squat', 'squat', 'kettlebell',
    'Bells in the rack position load the front side.',
    'Bells at the shoulders, elbows high, sit straight down.'),

  // Hinge
  entry('Barbell Deadlift', 'hinge', 'barbell',
    'The heaviest hinge — needs floor space and a bar.',
    'Bar over mid-foot, shins to the bar, push the floor away.'),
  entry('Barbell Romanian Deadlift', 'hinge', 'barbell',
    'Slow eccentric, hamstrings do the braking.',
    'Soft knees, push the hips back, bar close to the legs.'),
  entry('Dumbbell Romanian Deadlift', 'hinge', 'dumbbell',
    'Same hinge with a pair of bells — no platform needed.',
    'Bells in front of the thighs, hips back, stop at mid-shin.'),
  entry('Cable Pull-Through', 'hinge', 'cable',
    'Hip hinge on a cable: constant tension, zero setup.',
    'Face away from the stack, hinge back, snap the hips forward.'),
  entry('Kettlebell Swing', 'hinge', 'kettlebell',
    'Explosive hinge that fits in a corner.',
    'Hike the bell back, snap the hips, let the arms float.'),
  entry('Back Extension', 'hinge', 'machine',
    'The bench holds you; the posterior chain works.',
    'Hips on the pad, hinge down, rise until the body is straight.'),
  entry('Glute Bridge', 'hinge', 'bodyweight',
    'On the floor, no kit, direct glute work.',
    'Heels close, ribs down, squeeze the glutes at the top.'),

  // Single leg
  entry('Barbell Reverse Lunge', 'lunge', 'barbell',
    'Loaded single leg — needs a bar and room to step.',
    'Step back, back knee to a fist off the floor, drive through the front heel.'),
  entry('Dumbbell Walking Lunge', 'lunge', 'dumbbell',
    'Two bells at the sides, walk the length of the gym.',
    'Long step, torso tall, front shin vertical at the bottom.'),
  entry('Split Squat', 'lunge', 'bodyweight',
    'Static stance, no stepping, no kit.',
    'Rear foot back, drop straight down, front heel planted.'),
  entry('Kettlebell Reverse Lunge', 'lunge', 'kettlebell',
    'Bells in the rack position keep the torso upright.',
    'Bells at the shoulders, step back, drive up through the front leg.'),
  entry('Smith Machine Split Squat', 'lunge', 'smith',
    'The fixed bar removes the balance tax on single-leg work.',
    'Front foot forward, bar on the traps, drop straight down.'),

  // Hamstring curl
  entry('Seated Leg Curl', 'hamstring-curl', 'machine',
    'Isolated hamstrings, no lower-back load.',
    'Pad above the heels, curl to the seat, lower for three seconds.'),
  entry('Cable Leg Curl', 'hamstring-curl', 'cable',
    'An ankle strap turns any cable into a leg curl.',
    'Face the stack, curl the heel to the glute, keep the hips still.'),
  entry('Banded Leg Curl', 'hamstring-curl', 'band',
    'A band and a bench do the job.',
    'Anchor low, curl the heel up against the band, squeeze at the top.'),
  entry('Sliding Leg Curl', 'hamstring-curl', 'bodyweight',
    'Towel under the heels on a smooth floor.',
    'Hips lifted, slide the heels out, pull them back without dropping the hips.'),

  // Knee extension
  entry('Leg Extension', 'quad-extension', 'machine',
    'Direct quad work, seated and stable.',
    'Pad on the shins, extend to straight, pause, lower slowly.'),
  entry('Cable Leg Extension', 'quad-extension', 'cable',
    'Ankle strap, knee extension, constant tension.',
    'Face away from the stack, extend the knee, hold at the top.'),
  entry('Banded Terminal Knee Extension', 'quad-extension', 'band',
    'Knee-friendly band option for a cranky joint.',
    'Band behind the knee, straighten the leg against it, squeeze the quad.'),
  entry('Sissy Squat', 'quad-extension', 'bodyweight',
    'Bodyweight quad isolation — hold a support at first.',
    'Heels down, knees forward, lean back and lower under control.'),

  // Calf
  entry('Standing Calf Raise Machine', 'calf', 'machine',
    'The simple option when the calf block is free.',
    'Balls of the feet on the platform, full stretch, rise to the toes.'),
  entry('Seated Calf Raise', 'calf', 'machine',
    'Bent knee shifts the work to the soleus.',
    'Pads on the thighs, full stretch at the bottom, pause at the top.'),
  entry('Single-Leg Dumbbell Calf Raise', 'calf', 'dumbbell',
    'One dumbbell, one step, one leg at a time.',
    'Ball of the foot on a step, hold the bell on the same side, full range.'),
  entry('Barbell Standing Calf Raise', 'calf', 'barbell',
    'The bar version if the machine is taken.',
    'Bar on the traps, balls of the feet on a plate, rise and pause.'),
  entry('Single-Leg Bodyweight Calf Raise', 'calf', 'bodyweight',
    'No kit, no excuse.',
    'One foot on a step, rise to the toes, lower until the heel drops below.'),
  entry('Smith Machine Calf Raise', 'calf', 'smith',
    'Fixed bar, stable rise.',
    'Bar on the traps, balls of the feet on a plate, controlled reps.'),

  // Lateral raise
  entry('Dumbbell Lateral Raise', 'lateral-raise', 'dumbbell',
    'The go-to side delt builder, light and simple.',
    'Slight forward lean, lead with the elbows, stop at shoulder height.'),
  entry('Cable Lateral Raise', 'lateral-raise', 'cable',
    'Tension at the bottom where dumbbells go quiet.',
    'Cable behind the body, raise across the body to shoulder height.'),
  entry('Lateral Raise Machine', 'lateral-raise', 'machine',
    'Pads take the cheating out of it.',
    'Arms on the pads, raise to shoulder height, lower slowly.'),
  entry('Band Lateral Raise', 'lateral-raise', 'band',
    'A band under the foot is a travel-friendly side delt set.',
    'Stand on the band, raise to shoulder height, keep the ribs down.'),
  entry('Upright Row', 'lateral-raise', 'barbell',
    'Bar version — keep the grip wide for shoulder comfort.',
    'Wide grip, pull to chest height, elbows lead.'),

  // Rear delt
  entry('Dumbbell Reverse Fly', 'rear-delt', 'dumbbell',
    'Light bells, chest supported, rear delts do the work.',
    'Hinge forward, arms almost straight, sweep out to shoulder height.'),
  entry('Cable Face Pull', 'rear-delt', 'cable',
    'Rope at face height: rear delts and posture in one.',
    'Pull the rope to the forehead, elbows high, squeeze the blades.'),
  entry('Reverse Pec Deck', 'rear-delt', 'machine',
    'Seated and supported, easy to keep honest.',
    'Chest on the pad, sweep the arms back to shoulder height.'),
  entry('Banded Face Pull', 'rear-delt', 'band',
    'Anchor a band at face height and pull.',
    'Pull to the forehead, elbows high, hold the squeeze for a beat.'),
  entry('Band Pull-Apart', 'rear-delt', 'band',
    'The smallest kit in the gym, the biggest posture payoff.',
    'Arms straight at chest height, pull the band apart, squeeze the blades.'),

  // Biceps
  entry('Dumbbell Incline Curl', 'biceps', 'dumbbell',
    'The incline stretch makes light bells feel heavy.',
    'Arms hanging back, curl without swinging the elbow forward.'),
  entry('EZ-Bar Curl', 'biceps', 'barbell',
    'The angled bar is easier on the wrists than a straight bar.',
    'Elbows pinned, curl to the chest, lower for three seconds.'),
  entry('Cable Curl', 'biceps', 'cable',
    'Constant tension through the whole rep.',
    'Elbows at the sides, curl to the shoulders, resist the way down.'),
  entry('Preacher Curl Machine', 'biceps', 'machine',
    'The pad removes any chance of swinging.',
    'Armpits on the pad, curl, lower until the arm is almost straight.'),
  entry('Band Curl', 'biceps', 'band',
    'Stand on a band: curls anywhere.',
    'Stand on the band, elbows pinned, curl and squeeze at the top.'),

  // Triceps
  entry('Cable Rope Pushdown', 'triceps', 'cable',
    'The default triceps finisher, easy on the elbows.',
    'Elbows pinned, push down and split the rope at the bottom.'),
  entry('Overhead Dumbbell Extension', 'triceps', 'dumbbell',
    'The long head gets the stretch it misses in a pushdown.',
    'One bell behind the head, elbows narrow, extend without flaring.'),
  entry('Skull Crusher', 'triceps', 'barbell',
    'Lying extension with an EZ bar.',
    'Upper arms vertical, lower the bar to the forehead, extend.'),
  entry('Close-Grip Bench Press', 'triceps', 'barbell',
    'A heavy triceps press if the bar is free.',
    'Shoulder-width grip, elbows tucked, press to lockout.'),
  entry('Triceps Dip Machine', 'triceps', 'machine',
    'Assisted dips without the shoulder strain of a bench dip.',
    'Chest tall, elbows back, lower until the arms reach ~90°.'),
  entry('Bench Dip', 'triceps', 'bodyweight',
    'A bench and a bodyweight: the quickest triceps set in the gym.',
    'Hands on the bench behind you, elbows back, lower and press.'),
  entry('Band Pushdown', 'triceps', 'band',
    'Anchor high, push down, no stack needed.',
    'Anchor above the head, elbows pinned, extend and squeeze.'),

  // Chest fly
  entry('Cable Chest Fly', 'chest-fly', 'cable',
    'Tension at the stretch, where dumbbells give up.',
    'Slight forward lean, sweep the hands together, keep a soft elbow.'),
  entry('Pec Deck', 'chest-fly', 'machine',
    'Seated fly, no balance required.',
    'Elbows on the pads, bring the arms together, pause and return slowly.'),
  entry('Dumbbell Fly', 'chest-fly', 'dumbbell',
    'A bench and a pair of light bells.',
    'Soft elbows, open until the chest stretches, hug back together.'),
  entry('Band Chest Fly', 'chest-fly', 'band',
    'Anchor behind you and fly.',
    'Anchor at chest height behind, sweep the hands together in front.'),

  // Core
  entry('Plank', 'core', 'bodyweight',
    'The default anti-extension hold.',
    'Elbows under the shoulders, ribs down, squeeze glutes and hold.'),
  entry('Hanging Leg Raise', 'core', 'bodyweight',
    'A bar and a strong grip; the hardest bodyweight ab set here.',
    'Dead hang, raise the legs to hip height without swinging.'),
  entry('Pallof Press', 'core', 'cable',
    'Anti-rotation: the cable tries to twist you, you refuse.',
    'Cable at chest height, stand side on, press straight out, resist the twist.'),
  entry('Ab Crunch Machine', 'core', 'machine',
    'Loaded flexion with the spine supported.',
    'Chest tall, curl the ribs to the pelvis, return slowly.'),
  entry('Weighted Decline Sit-Up', 'core', 'dumbbell',
    'A bell on the chest turns a sit-up into a load.',
    'Bell at the chest, lower under control, curl up without pulling the neck.'),

  // Shrug
  entry('Dumbbell Shrug', 'shrug', 'dumbbell',
    'Bells at the sides, straight up and down.',
    'Shrug straight up to the ears, pause, lower slowly.'),
  entry('Barbell Shrug', 'shrug', 'barbell',
    'The heavy option if the bar is free.',
    'Bar in front, shrug up, no rolling of the shoulders.'),
  entry('Shrug Machine', 'shrug', 'machine',
    'Fixed handles, easy to load.',
    'Handles at the sides, shrug to the ears, hold the top.'),
  entry('Cable Shrug', 'shrug', 'cable',
    'Constant tension through the top of the shrug.',
    'Low cable, shrug straight up, pause and lower.'),
  entry('Smith Machine Shrug', 'shrug', 'smith',
    'Fixed path shrug.',
    'Bar in front, shrug straight up, no torso swing.'),

  // Grip & carry
  entry('Farmer Carry', 'grip', 'dumbbell',
    'Two heavy bells and a lap of the gym.',
    'Stand tall, shoulders back, walk without leaning.'),
  entry('Kettlebell Farmer Carry', 'grip', 'kettlebell',
    'Bells at the sides, grip and trunk together.',
    'Tall posture, short steps, no swinging.'),
  entry('Barbell Hold', 'grip', 'barbell',
    'Pick the bar up and stand still: the simplest grip test.',
    'Deadlift the bar, stand tall, hold until the grip fades.'),
  entry('Banded Wrist Curl', 'grip', 'band',
    'Forearms anywhere, no bench needed.',
    'Forearm on the thigh, curl the wrist against the band, full range.'),

  // Hip machines
  entry('Hip Abduction Machine', 'hip-abduction', 'machine',
    'Seated, isolated, no setup.',
    'Sit tall, push the knees out, pause and return slowly.'),
  entry('Cable Hip Abduction', 'hip-abduction', 'cable',
    'Ankle strap, stand tall, sweep the leg out.',
    'Hold the stack, sweep the outside leg out, keep the torso still.'),
  entry('Banded Lateral Walk', 'hip-abduction', 'band',
    'A band above the knees and a few steps.',
    'Band above the knees, quarter squat, step sideways without dragging.'),
  entry('Hip Adduction Machine', 'hip-adduction', 'machine',
    'The other half of the hip machine.',
    'Sit tall, squeeze the knees together, return under control.'),
  entry('Cable Hip Adduction', 'hip-adduction', 'cable',
    'Cable version of the inner-thigh squeeze.',
    'Strap on the ankle, sweep the leg across the body, keep the hips level.'),
  entry('Banded Hip Adduction', 'hip-adduction', 'band',
    'Band around an anchor, pull the leg in.',
    'Band low and to the side, draw the leg across, resist the return.')
]);

const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value !== 'string') return Number.NaN;
  const match = value.trim().replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : Number.NaN;
};

const round2 = (n) => Math.round(n * 100) / 100;

// 37.5 prints as "37.5", 40 prints as "40" — never "40.0" in a load card.
const tidy = (n) => String(round2(n));

export const equipmentLabel = (equipment) => EQUIPMENT[equipment]?.label ?? EQUIPMENT.other.label;

export const equipmentNote = (equipment) => EQUIPMENT_NOTE[equipment] ?? EQUIPMENT_NOTE.other;

// A starting load for the substitute, rounded down to the athlete's jump.
// `perHandKg` is filled for dumbbells so the card can say "2 × 15 kg" instead of
// a total nobody has ever loaded on one handle.
export const estimateSubstituteLoad = ({ weightKg, fromEquipment, toEquipment, step = DEFAULT_STEP_KG } = {}) => {
  const from = EQUIPMENT[fromEquipment] ?? EQUIPMENT.other;
  const to = EQUIPMENT[toEquipment] ?? EQUIPMENT.other;
  const jump = parseLoadStep(step) ?? DEFAULT_STEP_KG;
  const base = toNumber(weightKg);

  if (to.factor === 0) {
    // The substitute carries no external load: a number here would be fiction.
    return {
      weightKg: 0,
      perHandKg: null,
      equipment: to.id,
      text: to.id === 'band' ? 'band tension' : 'bodyweight',
      note: equipmentNote(to.id)
    };
  }

  if (from.factor === 0) {
    // The plan had nothing to convert from, so there is no honest estimate.
    return {
      weightKg: 0,
      perHandKg: null,
      equipment: to.id,
      text: '',
      note: `The plan had no load to convert — pick a starting weight by feel. ${equipmentNote(to.id)}`
    };
  }

  if (!Number.isFinite(base) || base <= 0) {
    return {
      weightKg: 0,
      perHandKg: null,
      equipment: to.id,
      text: '',
      note: `No load in the plan — pick a weight by feel. ${equipmentNote(to.id)}`
    };
  }

  const total = base * (to.factor / from.factor);

  if (to.id === 'dumbbell') {
    const perHand = Math.max(jump, roundToStep(total / 2, jump, 'down'));
    return {
      weightKg: round2(perHand * 2),
      perHandKg: round2(perHand),
      equipment: to.id,
      text: `2 × ${tidy(perHand)} kg`,
      note: equipmentNote(to.id)
    };
  }

  const weight = Math.max(jump, roundToStep(total, jump, 'down'));
  return {
    weightKg: round2(weight),
    perHandKg: null,
    equipment: to.id,
    text: `${tidy(weight)} kg`,
    note: equipmentNote(to.id)
  };
};

// Alternatives for one exercise: same pattern, different kit, best fallback
// first. One suggestion per equipment type keeps three cards from all saying
// "dumbbell"; an unrecognised lift returns nothing rather than a wrong guess.
export const suggestSubstitutes = (name, { limit = DEFAULT_SUGGESTION_LIMIT, weightKg, step = DEFAULT_STEP_KG, catalog = SUBSTITUTES } = {}) => {
  const pattern = detectPattern(name);
  if (!pattern) return [];
  const sourceEquipment = detectEquipment(name);
  const sourceName = normalize(name);
  const max = Math.max(0, Math.min(6, Number(limit) || 0));
  if (!max) return [];

  const candidates = catalog.filter(item => (
    item
    && item.pattern === pattern
    && normalize(item.name) !== sourceName
    && item.equipment !== sourceEquipment
    && EQUIPMENT[item.equipment]
  ));

  const seenEquipment = new Set();
  return candidates
    .map(item => ({ item, rank: EQUIPMENT[item.equipment].rank }))
    .sort((a, b) => a.rank - b.rank)
    .filter(({ item }) => {
      if (seenEquipment.has(item.equipment)) return false;
      seenEquipment.add(item.equipment);
      return true;
    })
    .slice(0, max)
    .map(({ item }) => ({
      ...item,
      equipmentLabel: equipmentLabel(item.equipment),
      load: estimateSubstituteLoad({
        weightKg,
        fromEquipment: sourceEquipment,
        toEquipment: item.equipment,
        step
      })
    }));
};

// True when a lift is specific enough to be matched to a pattern at all. The UI
// uses it to decide whether a swap button is honest or just noise.
export const canSubstitute = (name) => detectPattern(name) !== null && !!normalize(name);
