export const generateAIGymPlan = (formData) => {
  // Mock logic customized with the extremely detailed output the user requested
  const weight = parseInt(formData.weight) || 115;
  const isMale = formData.gender === 'male';
  // A rough BMR/TDEE calculation for fat loss
  const dailyCals = 2200; 

  return {
    overview: {
      title: "12-Week Transformation Phase 1",
      subtitle: `Optimized for ${formData.gymName || "your gym"}, focusing on ${formData.goal === 'fatloss' ? "maximum fat loss and muscle retention" : "your specific goals"}.`,
      specialNote: formData.problems ? `Adapted for: ${formData.problems}. Avoid heavy axial loading.` : "",
    },
    nutrition: {
        macros: {
            calories: dailyCals,
            protein: isMale ? "180g" : "130g",
            carbs: "180g",
            fat: "70g"
        },
        mealPlan: [
            { meal: "Breakfast", food: "4 scrambled eggs, 1 cup spinach, 1/2 cup Irish oatmeal." },
            { meal: "Lunch", food: "200g grilled chicken breast, 150g sweet potato, large mixed green salad with olive oil." },
            { meal: "Pre-Workout", food: "1 apple, 1 scoop whey protein in water." },
            { meal: "Dinner", food: "200g baked salmon, 1 cup steamed broccoli/asparagus, 1/2 cup quinoa." },
            { meal: "Snack", food: "1 cup greek yogurt with 15g almonds." }
        ]
    },
    progression: [
        { phase: "Weeks 1-4 (Foundation)", focus: "Neurological adaptation, learning proper form, building work capacity. Do not rush weight increases." },
        { phase: "Weeks 5-8 (Progressive Overload)", focus: "Increase volume and weight by 2-5% weekly. Introduction of supersets to elevate heart rate." },
        { phase: "Weeks 9-12 (Peak Fat Loss)", focus: "Maximum intensity. Rest times strictly monitored. Cardio volume increases gradually." }
    ],
    workout: {
      schedule: [
        {
          id: "day1",
          label: "Upper Body (Push/Pull Focus)",
          warmup: [
            { name: "Arm Circles & Shoulder Dislocates", duration: "3 mins" },
            { name: "Light Rowing Machine", duration: "5 mins" }
          ],
          exercises: [
            { name: "Dumbbell Bench Press", sets: 3, reps: "8-12", rest: "90s", weight: "Start: 10-15kg DBs", guide: "Keep shoulder blades retracted and feet planted. Press in an arc." },
            { name: "Lat Pulldown Machine", sets: 3, reps: "10-12", rest: "90s", weight: "Start: 30kg", guide: "Pull the bar down to your upper chest, squeezing the lats." },
            { name: "Seated Cable Row", sets: 3, reps: "10-12", rest: "90s", weight: "Start: 25kg", guide: "Keep back straight, pull handle to stomach, pause for 1s." },
            { name: "Dumbbell Lateral Raises", sets: 3, reps: "15", rest: "60s", weight: "Start: 5-8kg DBs", guide: "Raise arms to the side until parallel to the floor, slight bend in elbows." }
          ],
          cooldown: [
            { name: "Pec Stretch & Lat Stretch", duration: "5 mins" }
          ]
        },
        {
          id: "day2",
          label: "Lower Body & Core",
          warmup: [
            { name: "Bodyweight Squats & Lunges", duration: "3 mins" },
            { name: "Stationary Bike", duration: "5 mins" }
          ],
          exercises: [
            { name: "Leg Press Machine", sets: 4, reps: "10-12", rest: "120s", weight: "Start: 60-80kg", guide: "Lower weight until knees are at 90 degrees. Do not lock knees at top." },
            { name: "Leg Extension", sets: 3, reps: "12-15", rest: "60s", weight: "Start: 20-30kg", guide: "Squeeze quads at the top for 1s. Lower slowly." },
            { name: "Lying Leg Curls", sets: 3, reps: "12-15", rest: "60s", weight: "Start: 20-30kg", guide: "Keep hips pushed down into the pad." },
            { name: "Plank", sets: 3, reps: "30-45s", rest: "60s", weight: "Bodyweight", guide: "Keep core braced, body in a straight line from head to heels." }
          ],
          cooldown: [
            { name: "Hamstring & Quad Stretches", duration: "5 mins" }
          ]
        },
        {
            id: "day3",
            label: "Full Body & Cardio",
            warmup: [
              { name: "Jumping Jacks & Dynamic Stretching", duration: "5 mins" }
            ],
            exercises: [
              { name: "Goblet Squats", sets: 3, reps: "10-12", rest: "90s", weight: "Start: 12-16kg DB", guide: "Hold dumbbell at chest. Squat keeping chest up." },
              { name: "Machine Chest Press", sets: 3, reps: "10-12", rest: "90s", weight: "Start: 30-40kg", guide: "Press evenly, control the eccentric (lowering) phase." },
              { name: "Treadmill Walking (Incline)", sets: 1, reps: "25 mins", rest: "N/A", weight: "Incline: 8-10%, Speed: 4-5km/h", guide: "Keep a brisk pace without holding the handrails." }
            ],
            cooldown: [
              { name: "Full Body Foam Rolling", duration: "8 mins" }
            ]
        },
         {
            id: "day4",
            label: "Active Recovery / Light Core",
            warmup: [
              { name: "Brisk Walk", duration: "5 mins" }
            ],
            exercises: [
              { name: "Stationary Bike", sets: 1, reps: "20 mins", rest: "N/A", weight: "Moderate resistance", guide: "Keep heart rate in zone 2 (approx 110-120 bpm)." },
              { name: "Crunches", sets: 3, reps: "15-20", rest: "45s", weight: "Bodyweight", guide: "Contract abs, do not pull on your neck." },
              { name: "Bird-Dog", sets: 3, reps: "10 per side", rest: "45s", weight: "Bodyweight", guide: "Extend opposite arm and leg, hold for 2s." }
            ],
            cooldown: [
              { name: "Yoga Flow (Child's Pose, Cat-Cow)", duration: "10 mins" }
            ]
        }
      ]
    },
    mindset: [
        "Water Intake: Aim for minimum 3-4 liters of water daily.",
        "Sleep: Muscle recovery and fat loss happen while you sleep. Guard your 7-8 hours fiercely.",
        "Consistency over perfection: If you miss a meal or a workout, just get right back on track the next day. No guilt.",
        "Track your lifts: Write down the weights used each session so you can force progressive overload."
    ]
  };
};
