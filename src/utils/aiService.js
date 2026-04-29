import { getGenerativeModel } from 'firebase/ai';
import { aiInstance } from '../firebase';

export const generateWorkoutPlan = async (formData) => {
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
  // Safely extract JSON based on boundaries to avoid altering string contents with backticks
  const startIndex = text.indexOf('{');
  const endIndex = text.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
    text = text.substring(startIndex, endIndex + 1);
  }
  const generated = JSON.parse(text);

  return generated;
};