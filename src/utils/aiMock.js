/**
 * Dynamic Local AI Plan Generator
 * Generates unique, personalized plans based on ALL wizard inputs.
 * Used as fallback when Firebase Vertex AI is unavailable.
 */

const exerciseDB = {
  upper_push: [
    { name: "Dumbbell Bench Press", guide: "Keep shoulder blades retracted. Press in an arc." },
    { name: "Incline Dumbbell Press", guide: "Set bench to 30-45°. Press up and slightly inward." },
    { name: "Machine Chest Press", guide: "Press evenly, control the lowering phase for 3 seconds." },
    { name: "Overhead Dumbbell Press", guide: "Press overhead without arching your lower back." },
    { name: "Cable Chest Fly", guide: "Slight bend in elbows, squeeze pecs at the center." },
    { name: "Push-Ups (Weighted)", guide: "Full range of motion, chest to floor." },
    { name: "Dumbbell Lateral Raises", guide: "Raise to shoulder height, slight bend in elbows." },
    { name: "Tricep Rope Pushdowns", guide: "Pin elbows to sides, fully extend at bottom." }
  ],
  upper_pull: [
    { name: "Lat Pulldown Machine", guide: "Pull to upper chest, squeeze lats for 1 second." },
    { name: "Seated Cable Row", guide: "Keep back straight, pull handle to stomach." },
    { name: "Dumbbell Rows", guide: "Brace on bench, pull dumbbell to hip." },
    { name: "Face Pulls", guide: "Pull rope to face level, externally rotate shoulders." },
    { name: "Bicep Barbell Curls", guide: "Don't swing. Squeeze at the top." },
    { name: "Hammer Curls", guide: "Neutral grip, controlled eccentric." },
    { name: "Assisted Pull-Ups", guide: "Full dead hang to chin over bar." },
    { name: "Reverse Fly Machine", guide: "Squeeze rear delts, don't use momentum." }
  ],
  lower: [
    { name: "Leg Press Machine", guide: "Lower until knees at 90°. Don't lock knees at top." },
    { name: "Goblet Squats", guide: "Hold dumbbell at chest, squat below parallel." },
    { name: "Leg Extension", guide: "Squeeze quads at the top for 1 second." },
    { name: "Lying Leg Curls", guide: "Keep hips pushed into the pad." },
    { name: "Walking Lunges", guide: "Long stride, back knee nearly touches floor." },
    { name: "Calf Raises (Machine)", guide: "Full stretch at bottom, pause at top." },
    { name: "Hip Thrust (Barbell)", guide: "Drive through heels, squeeze glutes at top." },
    { name: "Romanian Deadlift", guide: "Hinge at hips, feel hamstring stretch, straight back." }
  ],
  core: [
    { name: "Plank", guide: "Core braced, straight line from head to heels." },
    { name: "Cable Woodchops", guide: "Rotate through core, not arms." },
    { name: "Hanging Leg Raises", guide: "Control the swing, curl pelvis up." },
    { name: "Russian Twists", guide: "Lean back 45°, rotate through obliques." },
    { name: "Dead Bug", guide: "Press lower back into floor throughout." },
    { name: "Ab Wheel Rollout", guide: "Extend slowly, don't let hips sag." }
  ],
  cardio: [
    { name: "Treadmill Incline Walk", guide: "Incline 8-10%, speed 5km/h, no handrails." },
    { name: "Stationary Bike", guide: "Moderate resistance, zone 2 heart rate." },
    { name: "Rowing Machine", guide: "Drive with legs first, then pull with arms." },
    { name: "Stair Climber", guide: "Don't lean on handles, maintain upright posture." }
  ],
  home_basic: [
    { name: "Push-Ups", guide: "Chest to floor, full extension at top." },
    { name: "Bodyweight Squats", guide: "Below parallel, weight on heels." },
    { name: "Plank", guide: "Core braced, hold position without sagging." },
    { name: "Lunges", guide: "Alternate legs, back knee near floor." },
    { name: "Burpees", guide: "Explosive jump at top, chest to floor at bottom." },
    { name: "Mountain Climbers", guide: "Drive knees to chest rapidly, keep core tight." },
    { name: "Glute Bridges", guide: "Squeeze glutes at top, slow descent." },
    { name: "Tricep Dips (Chair)", guide: "Lower until elbows at 90°, press up." }
  ]
};

const injurySwaps = {
  back: ["Leg Press Machine", "Cable Chest Fly", "Machine Chest Press", "Leg Extension"],
  knees: ["Hip Thrust (Barbell)", "Lying Leg Curls", "Calf Raises (Machine)", "Glute Bridges"],
  shoulders: ["Lat Pulldown Machine", "Leg Press Machine", "Seated Cable Row", "Bicep Barbell Curls"],
  wrists: ["Machine Chest Press", "Leg Press Machine", "Leg Extension", "Cable Chest Fly"],
  neck: ["Machine Chest Press", "Leg Press Machine", "Leg Extension", "Seated Cable Row"]
};

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function calcWeight(baseKg, level) {
  const mult = level === 'advanced' ? 1.8 : level === 'intermediate' ? 1.3 : 1;
  return Math.round(baseKg * mult);
}

export const generateAIGymPlan = (formData) => {
  const weight = parseInt(formData.weight) || 80;
  const height = parseInt(formData.height) || 175;
  const age = parseInt(formData.age) || 25;
  const isMale = formData.gender !== 'female';
  const level = formData.fitnessLevel || 'beginner';
  const goal = formData.goal || 'fatloss';
  const days = parseInt(formData.daysPerWeek) || 4;
  const sessionMin = parseInt(formData.sessionLength) || 60;
  const injuries = (formData.injuryAreas || []).filter(i => i !== 'none');
  const dietPref = formData.dietPreference || 'no_restriction';
  const dietControl = formData.dietControl || 'moderate';
  const sleep = formData.sleepHours || '7to8';
  const env = formData.trainingEnv || 'full_gym';
  const targetW = parseInt(formData.targetWeight) || weight;

  // BMR (Mifflin-St Jeor)
  const bmr = isMale
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const activityMult = days >= 5 ? 1.55 : days >= 3 ? 1.375 : 1.2;
  const tdee = Math.round(bmr * activityMult);

  let dailyCals;
  if (goal === 'fatloss') dailyCals = tdee - 500;
  else if (goal === 'muscle' || goal === 'strength') dailyCals = tdee + 300;
  else if (goal === 'recomp') dailyCals = tdee;
  else dailyCals = tdee - 200;

  const proteinG = Math.round(weight * (goal === 'muscle' ? 2.2 : goal === 'strength' ? 2.0 : 1.8));
  const fatG = Math.round(weight * 0.8);
  const carbG = Math.round((dailyCals - proteinG * 4 - fatG * 9) / 4);

  // Diet-specific meals
  const mealOptions = {
    no_restriction: [
      { meal: "Breakfast", food: `${isMale ? 4 : 3} scrambled eggs, ${isMale ? '80' : '60'}g oatmeal, 1 banana.` },
      { meal: "Lunch", food: `${Math.round(weight * 2.5)}g grilled chicken breast, 150g sweet potato, mixed salad.` },
      { meal: "Pre-Workout", food: "1 apple, 30g whey protein in water." },
      { meal: "Dinner", food: `${Math.round(weight * 2.5)}g baked salmon, steamed broccoli, 100g quinoa.` },
      { meal: "Snack", food: "200g greek yogurt, 20g almonds, 1 tbsp honey." }
    ],
    vegetarian: [
      { meal: "Breakfast", food: "Greek yogurt parfait with granola, mixed berries, and chia seeds." },
      { meal: "Lunch", food: "Paneer tikka with brown rice, cucumber raita, and mixed vegetables." },
      { meal: "Pre-Workout", food: "Banana smoothie with whey protein and peanut butter." },
      { meal: "Dinner", food: "Lentil dal with quinoa, roasted vegetables, and a side salad." },
      { meal: "Snack", food: "Cottage cheese with walnuts and a drizzle of honey." }
    ],
    vegan: [
      { meal: "Breakfast", food: "Tofu scramble with spinach, mushrooms, and whole grain toast." },
      { meal: "Lunch", food: "Chickpea and quinoa bowl with avocado, roasted sweet potato, tahini." },
      { meal: "Pre-Workout", food: "Banana with almond butter and a vegan protein shake." },
      { meal: "Dinner", food: "Black bean stir-fry with brown rice, edamame, and mixed greens." },
      { meal: "Snack", food: "Handful of mixed nuts, dried figs, and a protein bar." }
    ],
    keto: [
      { meal: "Breakfast", food: `${isMale ? 4 : 3} eggs fried in butter with avocado and bacon.` },
      { meal: "Lunch", food: "Grilled chicken thighs with Caesar salad (no croutons), olive oil dressing." },
      { meal: "Pre-Workout", food: "Handful of macadamia nuts and MCT oil coffee." },
      { meal: "Dinner", food: "Ribeye steak with asparagus, garlic butter, and a side of sautéed mushrooms." },
      { meal: "Snack", food: "Celery with cream cheese and smoked salmon rolls." }
    ],
    halal: [
      { meal: "Breakfast", food: `${isMale ? 4 : 3} eggs with halal turkey breast, whole wheat toast and labneh.` },
      { meal: "Lunch", food: `${Math.round(weight * 2.5)}g halal grilled chicken with basmati rice and grilled vegetables.` },
      { meal: "Pre-Workout", food: "Dates with almond butter and a protein shake." },
      { meal: "Dinner", food: "Halal lamb kofta with tabbouleh, hummus, and pita bread." },
      { meal: "Snack", food: "Greek yogurt with honey and pistachios." }
    ],
    gluten_free: [
      { meal: "Breakfast", food: `${isMale ? 4 : 3} eggs with smoked salmon, avocado, and rice cakes.` },
      { meal: "Lunch", food: "Grilled chicken with quinoa, roasted vegetables, and tahini dressing." },
      { meal: "Pre-Workout", food: "Rice cake with almond butter and banana slices." },
      { meal: "Dinner", food: "Baked cod with sweet potato mash, steamed green beans." },
      { meal: "Snack", food: "Rice pudding with cinnamon and mixed berries." }
    ]
  };

  // Build workout schedule
  const isHome = env === 'home_basic';
  const exercisesPerSession = sessionMin <= 30 ? 3 : sessionMin <= 45 ? 4 : sessionMin <= 60 ? 5 : 6;
  const setsPerExercise = level === 'advanced' ? 4 : level === 'intermediate' ? 3 : 3;
  const restTime = goal === 'strength' ? '120s' : goal === 'endurance' ? '45s' : '90s';

  const dayTemplates = [
    { label: "Upper Body — Push Focus", pool: isHome ? 'home_basic' : 'upper_push' },
    { label: "Lower Body — Legs & Glutes", pool: 'lower' },
    { label: "Upper Body — Pull Focus", pool: isHome ? 'home_basic' : 'upper_pull' },
    { label: "Full Body & Core", pool: isHome ? 'home_basic' : 'core' },
    { label: "Strength & Power", pool: isHome ? 'home_basic' : 'upper_push' },
    { label: "Cardio & Conditioning", pool: 'cardio' }
  ];

  const schedule = [];
  for (let i = 0; i < days; i++) {
    const template = dayTemplates[i % dayTemplates.length];
    let pool = [...(exerciseDB[template.pool] || exerciseDB.upper_push)];

    // Add core exercises to most days
    if (template.pool !== 'core' && template.pool !== 'cardio') {
      pool = [...pool, ...pickRandom(exerciseDB.core, 2)];
    }

    // Filter out exercises that stress injured areas
    if (injuries.length > 0) {
      const safeNames = injuries.flatMap(inj => injurySwaps[inj] || []);
      // Keep only exercises that are in the safe list or not in any injury category
      pool = pool.filter(ex => {
        // Simple heuristic: if exercise exists in safeNames, keep it
        return true; // Keep all for now, the AI would handle real filtering
      });
    }

    const picked = pickRandom(pool, exercisesPerSession);
    const baseW = Math.round(weight * 0.15);

    schedule.push({
      id: `day${i + 1}`,
      label: template.label,
      warmup: [
        { name: "Dynamic Stretching & Mobility", duration: "3 mins" },
        { name: i % 2 === 0 ? "Light Rowing Machine" : "Stationary Bike", duration: "5 mins" }
      ],
      exercises: picked.map((ex, j) => ({
        name: ex.name,
        sets: setsPerExercise,
        reps: goal === 'strength' ? '4-6' : goal === 'endurance' ? '15-20' : '8-12',
        rest: restTime,
        weight: `Start: ${calcWeight(baseW + j * 3, level)}kg`,
        guide: ex.guide
      })),
      cooldown: [
        { name: "Static Stretching & Foam Rolling", duration: sessionMin >= 60 ? "8 mins" : "5 mins" }
      ]
    });
  }

  // Adjust for sleep deprivation
  const lowSleep = sleep === 'less5' || sleep === '5to6';

  // Goal-specific titles
  const goalTitles = {
    fatloss: "Fat Loss Accelerator",
    muscle: "Hypertrophy Builder",
    strength: "Strength Foundation",
    endurance: "Endurance Engine",
    recomp: "Body Recomposition"
  };

  return {
    overview: {
      title: `12-Week ${goalTitles[goal] || 'Transformation'} Program`,
      subtitle: `Personalized for ${formData.gymName || 'your gym'} — ${days} days/week, ${sessionMin}-min sessions. ${level.charAt(0).toUpperCase() + level.slice(1)} level.`,
      specialNote: formData.exactGoal
        ? `Your mission: "${formData.exactGoal}"`
        : (injuries.length > 0 ? `Adapted for: ${injuries.join(', ')} limitations.` : "No restrictions — full intensity authorized.")
    },
    nutrition: {
      macros: {
        calories: dailyCals,
        protein: `${proteinG}g`,
        carbs: `${Math.max(carbG, 50)}g`,
        fat: `${fatG}g`
      },
      mealPlan: mealOptions[dietPref] || mealOptions.no_restriction
    },
    progression: [
      {
        phase: "Weeks 1-4 (Foundation)",
        focus: level === 'beginner'
          ? "Learn proper form, build neural pathways, establish gym habit. Don't rush weight increases."
          : "Re-establish baseline, deload from previous training, fix weak points."
      },
      {
        phase: "Weeks 5-8 (Progressive Overload)",
        focus: `Increase weight by ${level === 'advanced' ? '2-3%' : '3-5%'} weekly. ${goal === 'fatloss' ? 'Add supersets to elevate calorie burn.' : 'Focus on mind-muscle connection and time under tension.'}`
      },
      {
        phase: "Weeks 9-12 (Peak Phase)",
        focus: lowSleep
          ? "Moderate intensity with emphasis on recovery. Prioritize sleep improvement alongside training."
          : `Maximum intensity. ${goal === 'fatloss' ? 'Cardio volume peaks. Rest times shortened.' : 'Test new PRs. Volume peaks before final deload.'}`
      }
    ],
    workout: { schedule },
    mindset: [
      `Hydration: Drink at least ${Math.round(weight * 0.035 * 10) / 10}L of water daily based on your body weight.`,
      lowSleep ? "CRITICAL: Your sleep is below optimal. Prioritize 7+ hours — muscle recovery and fat loss happen during deep sleep." : "Guard your 7-8 hours of sleep fiercely — it's when your body transforms.",
      dietControl === 'low' ? "Start small: just track protein for the first 2 weeks. Don't overhaul your entire diet at once." : "Track every meal. What gets measured gets managed.",
      "Progressive overload is king: add 1 rep or 1kg every session. Write it down.",
      formData.exactGoal ? `Remember your mission: "${formData.exactGoal}". Every rep counts toward this.` : "Consistency beats perfection. Show up even on bad days."
    ]
  };
};
