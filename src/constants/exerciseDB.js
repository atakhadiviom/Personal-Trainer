export const exerciseDB = {
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

export const injurySwaps = {
  back: ["Leg Press Machine", "Cable Chest Fly", "Machine Chest Press", "Leg Extension"],
  knees: ["Hip Thrust (Barbell)", "Lying Leg Curls", "Calf Raises (Machine)", "Glute Bridges"],
  shoulders: ["Lat Pulldown Machine", "Leg Press Machine", "Seated Cable Row", "Bicep Barbell Curls"],
  wrists: ["Machine Chest Press", "Leg Press Machine", "Leg Extension", "Cable Chest Fly"],
  neck: ["Machine Chest Press", "Leg Press Machine", "Leg Extension", "Seated Cable Row"]
};
