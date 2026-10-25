const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

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
