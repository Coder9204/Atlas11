import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { getTemplate } from './emailTemplates';

function getResend(): Resend {
  const apiKey = functions.config().resend?.api_key;
  if (!apiKey) {
    throw new Error('Resend API key not configured. Set resend.api_key in Firebase config.');
  }
  return new Resend(apiKey);
}

const FROM_ADDRESS = 'Coach Atlas <hello@atlascoach.com>';

/**
 * Send an email using a named template.
 */
export async function sendEmail(
  to: string,
  template: string,
  data: Record<string, string> = {}
): Promise<void> {
  const resend = getResend();
  const { subject, html } = getTemplate(template, data);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });
}

/**
 * Look up a user's email from Firestore and send a templated email.
 */
export async function triggerEmail(
  uid: string,
  template: string,
  extraData: Record<string, string> = {}
): Promise<void> {
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  const userData = userDoc.data();

  if (!userData?.email) {
    console.warn(`Cannot send ${template} email: no email for user ${uid}`);
    return;
  }

  const data = {
    name: userData.displayName || 'Learner',
    tier: userData.subscription?.tier || 'free',
    ...extraData,
  };

  await sendEmail(userData.email, template, data);
}

/**
 * Scheduled function: send streak reminder emails daily at 9am UTC.
 * Queries users with streaks who haven't been active today.
 */
export const sendStreakReminders = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find users who were active yesterday but not today, and have email preferences enabled
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const usersSnapshot = await db.collection('users')
      .where('emailPreferences.streakReminders', '==', true)
      .where('lastActiveDate', '>=', yesterday)
      .where('lastActiveDate', '<', today)
      .limit(500)
      .get();

    const promises: Promise<void>[] = [];
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.email) {
        promises.push(
          sendEmail(userData.email, 'streak_reminder', {
            name: userData.displayName || 'Learner',
            streakDays: String(userData.streakDays || 1),
          }).catch((err) => console.error(`Failed streak email for ${userDoc.id}:`, err))
        );
      }
    }

    await Promise.all(promises);
    console.log(`Sent ${promises.length} streak reminder emails.`);
  });
