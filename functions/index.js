const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * AI Generation Endpoint
 * Process Gemini requests securely on the backend.
 */
exports.generateNovaFitPlan = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in to generate a plan.");
  }

  const formData = request.data.formData || {};
  const apiKey = process.env.GEMINI_API_KEY || "YOUR_GEMINI_KEY_HERE";
  
  if (apiKey === "YOUR_GEMINI_KEY_HERE") {
    throw new HttpsError("internal", "Server missing Gemini API Key. Developer needs to configure the backend environment variable.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      overview: { type: SchemaType.STRING },
      nutrition: {
        type: SchemaType.OBJECT,
        properties: {
          calories: { type: SchemaType.NUMBER },
          protein: { type: SchemaType.NUMBER },
          carbs: { type: SchemaType.NUMBER },
          fat: { type: SchemaType.NUMBER },
          meals: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        }
      },
      progression: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
             phase: { type: SchemaType.STRING },
             focus: { type: SchemaType.STRING }
          }
        }
      },
      workout: {
        type: SchemaType.OBJECT,
        properties: {
          schedule: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                label: { type: SchemaType.STRING },
                warmup: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, duration: { type: SchemaType.STRING } } } },
                exercises: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, sets: { type: SchemaType.NUMBER }, reps: { type: SchemaType.STRING }, rest: { type: SchemaType.STRING }, weight: { type: SchemaType.STRING } } } },
                cooldown: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, duration: { type: SchemaType.STRING } } } }
              }
            }
          }
        }
      },
      mindset: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
    }
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    }
  });

  const prompt = `You are a professional, aggressive AI Gym Trainer. Create a highly specific 12-week plan for a ${formData.age}yo ${formData.gender}, ${formData.weight}kg, ${formData.height}cm. Goal: ${formData.goal}. Limitations: ${formData.problems}. Gym: ${formData.gymName}. Create an exact, structured 4-day workout schedule with exact weights to start with, warmups, and cool-downs. Return only valid JSON.`;

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    throw new HttpsError("internal", "Gemini Generation Failed: " + error.message);
  }
});

/**
 * Daily Workout Nudge (Runs every morning at 8:00 AM)
 */
exports.dailyWorkoutNudge = onSchedule("0 8 * * *", async () => {
  const BATCH_SIZE = 500;
  let lastVisible = null;
  let hasMore = true;

  while (hasMore) {
    let query = admin.firestore().collection('users')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(BATCH_SIZE);

    if (lastVisible) {
      query = query.startAfter(lastVisible);
    }

    const usersSnapshot = await query.get();

    if (usersSnapshot.empty) {
      hasMore = false;
      break;
    }

    const tokens = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) tokens.push(data.fcmToken);
    });

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: "Time to crush it! 🏋️",
          body: "Your NovaFit schedule is waiting. Get to the gym and log your sets today."
        },
        tokens: tokens
      };
      await admin.messaging().sendMulticast(message);
    }

    lastVisible = usersSnapshot.docs[usersSnapshot.docs.length - 1];
  }
});

/**
 * Weekly Photo Accountability Nudge (Runs every Sunday at 9:00 AM)
 */
exports.weeklyPhotoNudge = onSchedule("0 9 * * 0", async () => {
  const usersSnapshot = await admin.firestore().collection('users').get();
  const tokens = [];
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.fcmToken) tokens.push(data.fcmToken);
  });

  if (tokens.length > 0) {
    const message = {
      notification: {
        title: "📸 Progress Check-in!",
        body: "A new week begins tomorrow. Snap your weekly full-body photo to track your transformation."
      },
      tokens: tokens
    };
    await admin.messaging().sendMulticast(message);
  }
});
