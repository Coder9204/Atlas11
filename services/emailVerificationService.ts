/**
 * Client-side email verification service.
 * Calls Firebase Cloud Functions to send/verify codes via Resend.
 */

import { getFunctionsInstance } from './firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Request a verification code be sent to the current user's email.
 */
export async function requestVerificationCode(email?: string): Promise<void> {
  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available.');
  }

  const sendCode = httpsCallable(functions, 'sendVerificationCode');
  await sendCode({ email });
}

/**
 * Verify a 6-digit code entered by the user.
 * Returns true if verified successfully.
 */
export async function submitVerificationCode(code: string): Promise<boolean> {
  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available.');
  }

  const verifyCode = httpsCallable(functions, 'verifyEmailCode');
  const result = await verifyCode({ code });
  const data = result.data as { verified: boolean };
  return data.verified;
}
