const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const DEEPSEEK_API_KEY = defineSecret("DEEPSEEK_API_KEY");

admin.initializeApp();

/**
 * AI proxy: forwards a prompt to DeepSeek and returns the text.
 * The API key is a Firebase secret and never reaches the client.
 *   firebase functions:secrets:set DEEPSEEK_API_KEY
 */
exports.deepseekChat = onCall(
  { secrets: [DEEPSEEK_API_KEY], timeoutSeconds: 120, maxInstances: 10 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    const prompt = request.data && request.data.prompt;
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 20000) {
      throw new HttpsError("invalid-argument", "A prompt string (max 20000 chars) is required.");
    }

    let res;
    try {
      res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY.value()}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 8000,
        }),
      });
    } catch (err) {
      console.error("DeepSeek request failed", err);
      throw new HttpsError("unavailable", "AI service unreachable.");
    }

    if (!res.ok) {
      console.error("DeepSeek error", res.status, await res.text());
      throw new HttpsError("internal", `AI service error (${res.status}).`);
    }
    const json = await res.json();
    const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (!text) throw new HttpsError("internal", "Empty AI response.");
    return { text };
  }
);

exports.dailyWorkoutNudge = onSchedule("0 8 * * *", async () => {
  const BATCH_SIZE = 500;
  let lastDoc = null;
  let hasMore = true;

  while (hasMore) {
    let query = admin.firestore()
      .collection('users')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
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

    lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];
  }
});

/**
 * Weekly Progress Accountability Nudge (Runs every Sunday at 9:00 AM)
 */
exports.weeklyProgressNudge = onSchedule("0 9 * * 0", async () => {
  const BATCH_SIZE = 500;
  let lastDoc = null;
  let hasMore = true;

  while (hasMore) {
    let query = admin.firestore()
      .collection('users')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
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
          title: "📈 Progress Check-in!",
          body: "A new week begins tomorrow. Review your weekly progression and update your stats to track your transformation."
        },
        tokens: tokens
      };
      await admin.messaging().sendMulticast(message);
    }

    lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];
  }
});
